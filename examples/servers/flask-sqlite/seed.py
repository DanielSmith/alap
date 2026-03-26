# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

"""Seed the SQLite database with a demo Alap configuration."""

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "alap_configs.db"

demo_config = {
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


def seed() -> None:
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
    conn.execute(
        """
        INSERT OR REPLACE INTO configs (name, config, created_at, updated_at)
        VALUES ('demo', ?, datetime('now'), datetime('now'))
        """,
        (json.dumps(demo_config),),
    )
    conn.commit()
    conn.close()
    print("Seeded 'demo' config into", DB_PATH)


if __name__ == "__main__":
    seed()
