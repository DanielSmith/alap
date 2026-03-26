# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""Alap Config Server — Flask + SQLite implementation."""

import json
import re
import sqlite3
from pathlib import Path

from flask import Flask, Response, g, jsonify, request, send_from_directory

from flask_cors import CORS

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "shared"))
from validate_regex import validate_regex
from expression_parser import cherry_pick_links, merge_configs, resolve_expression

app = Flask(__name__, static_folder="public", static_url_path="")
CORS(app)


def warn_hyphens(config: dict) -> None:
    """Log a warning for any hyphenated keys in allLinks, macros, or searchPatterns."""
    sections = ("allLinks", "macros", "searchPatterns")
    for section in sections:
        mapping = config.get(section)
        if not isinstance(mapping, dict):
            continue
        for key in mapping:
            if "-" in key:
                print(
                    f'[alap] {section} key "{key}" contains a hyphen '
                    f'— use underscores. "-" is the WITHOUT operator.',
                    flush=True,
                )

DB_PATH = Path(__file__).parent / "alap_configs.db"


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db() -> sqlite3.Connection:
    """Return a per-request database connection stored on Flask's `g`."""
    if "db" not in g:
        g.db = sqlite3.connect(str(DB_PATH))
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc: BaseException | None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db() -> None:
    """Create the configs table if it doesn't exist."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS configs (
            name       TEXT PRIMARY KEY,
            config     TEXT NOT NULL,
            created_at TEXT,
            updated_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return send_from_directory(Path(__file__).parent / "public", "index.html")



# ---------------------------------------------------------------------------
# 1. GET /configs — list all config names
# ---------------------------------------------------------------------------

@app.route("/configs", methods=["GET"])
def list_configs():
    rows = get_db().execute("SELECT name FROM configs ORDER BY name").fetchall()
    return jsonify([row["name"] for row in rows])


# ---------------------------------------------------------------------------
# 2. GET /configs/<name> — load a config
# ---------------------------------------------------------------------------

@app.route("/configs/<name>", methods=["GET"])
def load_config(name: str):
    row = get_db().execute(
        "SELECT config, created_at, updated_at FROM configs WHERE name = ?",
        (name,),
    ).fetchone()

    if row is None:
        return jsonify({"error": "Config not found"}), 404

    return jsonify({
        "config": json.loads(row["config"]),
        "meta": {
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        },
    })


# ---------------------------------------------------------------------------
# 3. PUT /configs/<name> — save / upsert a config
# ---------------------------------------------------------------------------

@app.route("/configs/<name>", methods=["PUT"])
def save_config(name: str):
    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "Invalid JSON body"}), 400

    warn_hyphens(body)
    config_text = json.dumps(body)
    db = get_db()

    existing = db.execute(
        "SELECT 1 FROM configs WHERE name = ?", (name,)
    ).fetchone()

    if existing:
        db.execute(
            "UPDATE configs SET config = ?, updated_at = datetime('now') WHERE name = ?",
            (config_text, name),
        )
    else:
        db.execute(
            "INSERT INTO configs (name, config, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))",
            (name, config_text),
        )

    db.commit()
    return Response(status=204)


# ---------------------------------------------------------------------------
# 4. DELETE /configs/<name> — remove a config
# ---------------------------------------------------------------------------

@app.route("/configs/<name>", methods=["DELETE"])
def delete_config(name: str):
    db = get_db()
    db.execute("DELETE FROM configs WHERE name = ?", (name,))
    db.commit()
    return Response(status=204)


# ---------------------------------------------------------------------------
# 5. GET /search — search across all configs
# ---------------------------------------------------------------------------

@app.route("/search", methods=["GET"])
def search_configs():
    tag = request.args.get("tag")
    q = request.args.get("q")
    regex_pattern = request.args.get("regex")
    fields_param = request.args.get("fields", "label,url,tags,description,id")
    config_filter = request.args.get("config")
    limit = min(int(request.args.get("limit", 100)), 1000)

    fields = [f.strip() for f in fields_param.split(",")]

    # Compile regex once if provided
    compiled_regex = None
    if regex_pattern:
        check = validate_regex(regex_pattern)
        if not check["safe"]:
            return jsonify({"error": f"Invalid regex: {check['reason']}"}), 400
        try:
            compiled_regex = re.compile(regex_pattern, re.IGNORECASE)
        except re.error:
            return jsonify({"error": "Invalid regex"}), 400

    # Compile config name filter
    config_regex = None
    if config_filter:
        check = validate_regex(config_filter)
        if not check["safe"]:
            return jsonify({"error": f"Invalid config regex: {check['reason']}"}), 400
        try:
            config_regex = re.compile(config_filter, re.IGNORECASE)
        except re.error:
            return jsonify({"error": "Invalid config regex"}), 400

    rows = get_db().execute("SELECT name, config FROM configs").fetchall()

    results: list[dict] = []
    configs_searched = 0
    links_scanned = 0

    for row in rows:
        config_name = row["name"]
        if config_regex and not config_regex.search(config_name):
            continue

        configs_searched += 1
        config = json.loads(row["config"])
        all_links = config.get("allLinks", {})

        for link_id, link in all_links.items():
            links_scanned += 1
            if len(results) >= limit:
                break

            if _matches(link, link_id, tag=tag, q=q, regex=compiled_regex, fields=fields):
                results.append({
                    "configName": config_name,
                    "id": link_id,
                    "link": link,
                })

        if len(results) >= limit:
            break

    return jsonify({
        "results": results,
        "configsSearched": configs_searched,
        "linksScanned": links_scanned,
    })


def _matches(
    link: dict,
    link_id: str,
    *,
    tag: str | None,
    q: str | None,
    regex: re.Pattern | None,
    fields: list[str],
) -> bool:
    """Check whether a link matches the search criteria."""
    # Tag filter is independent — must match if provided
    if tag:
        tags = link.get("tags", [])
        if tag not in tags:
            return False

    # Text or regex search across selected fields
    if q or regex:
        searchable = _field_values(link, link_id, fields)
        if q:
            q_lower = q.lower()
            if not any(q_lower in v.lower() for v in searchable):
                return False
        if regex:
            if not any(regex.search(v) for v in searchable):
                return False

    # If only tag was specified (no q/regex), the tag check above is sufficient
    if not tag and not q and not regex:
        return False  # no criteria — match nothing

    return True


def _field_values(link: dict, link_id: str, fields: list[str]) -> list[str]:
    """Extract searchable string values from a link for the given fields."""
    values: list[str] = []
    for field in fields:
        if field == "id":
            values.append(link_id)
        elif field == "tags":
            values.extend(link.get("tags", []))
        else:
            val = link.get(field)
            if val is not None:
                values.append(str(val))
    return values


# ---------------------------------------------------------------------------
# 6. POST /cherry-pick — resolve expression against a config, return subset
# ---------------------------------------------------------------------------

@app.route("/cherry-pick", methods=["POST"])
def cherry_pick():
    body = request.get_json(silent=True) or {}
    source = body.get("source")
    expression = body.get("expression")

    if not source or not expression:
        return jsonify({"error": 'Provide "source" and "expression"'}), 400

    row = get_db().execute(
        "SELECT config FROM configs WHERE name = ?", (source,)
    ).fetchone()

    if row is None:
        return jsonify({"error": f'Config "{source}" not found'}), 404

    config = json.loads(row["config"])
    all_links = cherry_pick_links(config, expression)

    return jsonify({"allLinks": all_links})


# ---------------------------------------------------------------------------
# 7. POST /query — server-side expression resolution
# ---------------------------------------------------------------------------

@app.route("/query", methods=["POST"])
def query_endpoint():
    body = request.get_json(silent=True) or {}
    expression = body.get("expression")

    if not expression:
        return jsonify({"error": 'Provide "expression"'}), 400

    config_names = body.get("configs")
    config_name = body.get("configName", "demo")

    db = get_db()

    if isinstance(config_names, list):
        configs = []
        for name in config_names:
            row = db.execute(
                "SELECT config FROM configs WHERE name = ?", (name,)
            ).fetchone()
            if row is not None:
                configs.append(json.loads(row["config"]))

        if not configs:
            return jsonify({"error": "None of the requested configs were found"}), 404

        config = merge_configs(*configs)
    else:
        row = db.execute(
            "SELECT config FROM configs WHERE name = ?", (config_name,)
        ).fetchone()

        if row is None:
            return jsonify({"error": f'Config "{config_name}" not found'}), 404

        config = json.loads(row["config"])

    results = resolve_expression(config, expression)

    return jsonify({"results": results})


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)
