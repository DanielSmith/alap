# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""Seed the database with a demo Alap config."""

import os

import psycopg
from psycopg.types.json import Json

DB_PARAMS = {
    "host": os.environ.get("POSTGRES_HOST", "localhost"),
    "port": int(os.environ.get("POSTGRES_PORT", "5432")),
    "dbname": os.environ.get("POSTGRES_DB", "alap"),
    "user": os.environ.get("POSTGRES_USER", "postgres"),
    "password": os.environ.get("POSTGRES_PASSWORD", "postgres"),
}

DEMO_CONFIG = {
    "settings": {"listType": "ul", "menuTimeout": 5000},
    "macros": {
        "cars": {"linkItems": "vwbug, bmwe36"},
        "nycbridges": {"linkItems": ".nyc + .bridge"},
    },
    "allLinks": {
        "vwbug": {
            "label": "VW Bug \u2014 Wikipedia",
            "url": "https://en.wikipedia.org/wiki/Volkswagen_Beetle",
            "tags": ["car", "vw", "germany"],
        },
        "bmwe36": {
            "label": "BMW E36 \u2014 Wikipedia",
            "url": "https://en.wikipedia.org/wiki/BMW_3_Series_(E36)",
            "tags": ["car", "bmw", "germany"],
        },
        "miata": {
            "label": "Mazda Miata \u2014 Wikipedia",
            "url": "https://en.wikipedia.org/wiki/Mazda_MX-5",
            "tags": ["car", "mazda", "japan"],
        },
        "brooklyn": {
            "label": "Brooklyn Bridge",
            "url": "https://en.wikipedia.org/wiki/Brooklyn_Bridge",
            "tags": ["nyc", "bridge", "landmark"],
        },
        "manhattan": {
            "label": "Manhattan Bridge",
            "url": "https://en.wikipedia.org/wiki/Manhattan_Bridge",
            "tags": ["nyc", "bridge"],
        },
        "highline": {
            "label": "The High Line",
            "url": "https://en.wikipedia.org/wiki/High_Line",
            "tags": ["nyc", "park", "landmark"],
        },
        "centralpark": {
            "label": "Central Park",
            "url": "https://en.wikipedia.org/wiki/Central_Park",
            "tags": ["nyc", "park"],
        },
        "goldengate": {
            "label": "Golden Gate Bridge",
            "url": "https://en.wikipedia.org/wiki/Golden_Gate_Bridge",
            "tags": ["sf", "bridge", "landmark"],
        },
        "dolores": {
            "label": "Dolores Park",
            "url": "https://en.wikipedia.org/wiki/Dolores_Park",
            "tags": ["sf", "park"],
        },
        "aqus": {
            "label": "Aqus Cafe",
            "url": "https://aqus.com",
            "tags": ["coffee", "sf"],
        },
        "bluebottle": {
            "label": "Blue Bottle Coffee",
            "url": "https://bluebottlecoffee.com",
            "tags": ["coffee", "sf", "nyc"],
        },
        "acre": {
            "label": "Acre Coffee",
            "url": "https://acrecoffee.com",
            "tags": ["coffee"],
        },
    },
}

UPSERT = """\
INSERT INTO configs (name, config)
VALUES (%(name)s, %(config)s)
ON CONFLICT (name) DO UPDATE
    SET config     = EXCLUDED.config,
        updated_at = now();
"""


CREATE_TABLE = """\
CREATE TABLE IF NOT EXISTS configs (
    name       TEXT PRIMARY KEY,
    config     JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def seed():
    conn = psycopg.connect(**DB_PARAMS)
    try:
        conn.execute(CREATE_TABLE)
        conn.execute(UPSERT, {"name": "demo", "config": Json(DEMO_CONFIG)})
        conn.commit()
        print("Seeded 'demo' config.")
    finally:
        conn.close()


if __name__ == "__main__":
    seed()
