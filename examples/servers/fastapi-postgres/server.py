# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""Alap Config Server — FastAPI + PostgreSQL."""

import os
import re
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))
from validate_regex import validate_regex
from expression_parser import cherry_pick_links, merge_configs, resolve_expression

import psycopg
from fastapi import FastAPI, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from psycopg.rows import dict_row
from psycopg.types.json import Json

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

DB_PARAMS = {
    "host": os.environ.get("POSTGRES_HOST", "localhost"),
    "port": int(os.environ.get("POSTGRES_PORT", "5432")),
    "dbname": os.environ.get("POSTGRES_DB", "alap"),
    "user": os.environ.get("POSTGRES_USER", "postgres"),
    "password": os.environ.get("POSTGRES_PASSWORD", "postgres"),
}

CREATE_TABLE = """\
CREATE TABLE IF NOT EXISTS configs (
    name       TEXT PRIMARY KEY,
    config     JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

UPSERT = """\
INSERT INTO configs (name, config)
VALUES (%(name)s, %(config)s)
ON CONFLICT (name) DO UPDATE
    SET config     = EXCLUDED.config,
        updated_at = now();
"""


@contextmanager
def get_conn():
    """Yield a connection with autocommit, close on exit."""
    conn = psycopg.connect(**DB_PARAMS, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.execute(CREATE_TABLE)
        conn.commit()


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

def warn_hyphens(config: dict) -> None:
    """Log a warning for any hyphenated keys in allLinks, macros, or searchPatterns."""
    sections = ("allLinks", "macros", "searchPatterns")
    for section in sections:
        mapping = config.get(section) if isinstance(config, dict) else None
        if not isinstance(mapping, dict):
            continue
        for key in mapping:
            if "-" in key:
                print(
                    f'[alap] {section} key "{key}" contains a hyphen '
                    f'— use underscores. "-" is the WITHOUT operator.',
                    flush=True,
                )


app = FastAPI(title="Alap Config Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

# 1. GET /configs — list all config names
@app.get("/configs")
def list_configs():
    with get_conn() as conn:
        rows = conn.execute("SELECT name FROM configs ORDER BY name").fetchall()
    return [r["name"] for r in rows]


# 2. GET /configs/{name} — load a config
@app.get("/configs/{name}")
def load_config(name: str):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT config, created_at, updated_at FROM configs WHERE name = %(name)s",
            {"name": name},
        ).fetchone()
    if row is None:
        return JSONResponse({"error": "Config not found"}, status_code=404)
    return {
        "config": row["config"],
        "meta": {
            "createdAt": row["created_at"].isoformat(),
            "updatedAt": row["updated_at"].isoformat(),
        },
    }


# 3. PUT /configs/{name} — save/upsert a config
@app.put("/configs/{name}", status_code=204)
async def save_config(name: str, request: Request):
    body = await request.json()
    warn_hyphens(body)
    with get_conn() as conn:
        conn.execute(UPSERT, {"name": name, "config": Json(body)})
        conn.commit()
    return Response(status_code=204)


# 4. DELETE /configs/{name} — remove a config
@app.delete("/configs/{name}", status_code=204)
def delete_config(name: str):
    with get_conn() as conn:
        conn.execute("DELETE FROM configs WHERE name = %(name)s", {"name": name})
        conn.commit()
    return Response(status_code=204)


# 5. GET /search — search across all configs
@app.get("/search")
def search_configs(
    tag: Optional[str] = None,
    q: Optional[str] = None,
    regex: Optional[str] = None,
    fields: str = "label,url,tags,description,id",
    config: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
):
    field_list = [f.strip() for f in fields.split(",")]
    regex_pat = None
    if regex:
        check = validate_regex(regex)
        if not check["safe"]:
            return JSONResponse({"error": f"Invalid regex: {check['reason']}"}, status_code=400)
        try:
            regex_pat = re.compile(regex, re.IGNORECASE)
        except re.error:
            return JSONResponse({"error": "Invalid regex"}, status_code=400)

    config_pat = None
    if config:
        check = validate_regex(config)
        if not check["safe"]:
            return JSONResponse({"error": f"Invalid config regex: {check['reason']}"}, status_code=400)
        try:
            config_pat = re.compile(config, re.IGNORECASE)
        except re.error:
            return JSONResponse({"error": "Invalid config regex"}, status_code=400)

    with get_conn() as conn:
        rows = conn.execute("SELECT name, config FROM configs ORDER BY name").fetchall()

    results: list[dict] = []
    configs_searched = 0
    links_scanned = 0

    for row in rows:
        cfg_name = row["name"]
        if config_pat and not config_pat.search(cfg_name):
            continue
        configs_searched += 1

        all_links = row["config"].get("allLinks", {})
        for link_id, link in all_links.items():
            links_scanned += 1
            if len(results) >= limit:
                break

            if tag:
                link_tags = link.get("tags", [])
                if tag not in link_tags:
                    continue

            if q:
                q_lower = q.lower()
                if not _text_match(link, link_id, field_list, q_lower):
                    continue

            if regex_pat:
                if not _regex_match(link, link_id, field_list, regex_pat):
                    continue

            results.append({
                "configName": cfg_name,
                "id": link_id,
                "link": link,
            })

        if len(results) >= limit:
            break

    return {
        "results": results,
        "configsSearched": configs_searched,
        "linksScanned": links_scanned,
    }


def _field_values(link: dict, link_id: str, field_list: list[str]) -> list[str]:
    """Extract string values from a link for the requested fields."""
    values: list[str] = []
    for f in field_list:
        if f == "id":
            values.append(link_id)
        elif f == "tags":
            values.extend(link.get("tags", []))
        else:
            val = link.get(f)
            if val is not None:
                values.append(str(val))
    return values


def _text_match(link: dict, link_id: str, field_list: list[str], q_lower: str) -> bool:
    for val in _field_values(link, link_id, field_list):
        if q_lower in val.lower():
            return True
    return False


def _regex_match(link: dict, link_id: str, field_list: list[str], pat: re.Pattern) -> bool:
    for val in _field_values(link, link_id, field_list):
        if pat.search(val):
            return True
    return False


# 6. POST /cherry-pick — resolve expression against a config, return subset
@app.post("/cherry-pick")
async def cherry_pick(request: Request):
    body = await request.json()
    source = body.get("source")
    expression = body.get("expression")

    if not source or not expression:
        return JSONResponse({"error": 'Provide "source" and "expression"'}, status_code=400)

    with get_conn() as conn:
        row = conn.execute(
            "SELECT config FROM configs WHERE name = %(name)s",
            {"name": source},
        ).fetchone()

    if not row:
        return JSONResponse({"error": f'Config "{source}" not found'}, status_code=404)

    config = row["config"]
    all_links = cherry_pick_links(config, expression)

    return {"allLinks": all_links}


# 7. POST /query — server-side expression resolution
@app.post("/query")
async def query_endpoint(request: Request):
    body = await request.json()
    expression = body.get("expression")

    if not expression:
        return JSONResponse({"error": 'Provide "expression"'}, status_code=400)

    config_names = body.get("configs")
    config_name = body.get("configName", "demo")

    with get_conn() as conn:
        if isinstance(config_names, list):
            configs = []
            for name in config_names:
                row = conn.execute(
                    "SELECT config FROM configs WHERE name = %(name)s",
                    {"name": name},
                ).fetchone()
                if row:
                    configs.append(row["config"])

            if not configs:
                return JSONResponse({"error": "None of the requested configs were found"}, status_code=404)

            config = merge_configs(*configs)
        else:
            row = conn.execute(
                "SELECT config FROM configs WHERE name = %(name)s",
                {"name": config_name},
            ).fetchone()

            if not row:
                return JSONResponse({"error": f'Config "{config_name}" not found'}, status_code=404)

            config = row["config"]

    results = resolve_expression(config, expression)

    return {"results": results}


# ---------------------------------------------------------------------------
# Static files & index.html
# ---------------------------------------------------------------------------

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "public")
@app.get("/")
def index():
    return FileResponse(os.path.join(PUBLIC_DIR, "index.html"))


app.mount("/", StaticFiles(directory=PUBLIC_DIR), name="static")
