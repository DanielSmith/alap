# frozen_string_literal: true

# Copyright 2026 Daniel Smith
# Licensed under the Apache License, Version 2.0
# See https://www.apache.org/licenses/LICENSE-2.0

require "sqlite3"
require "json"

DB_PATH = File.join(__dir__, "alap.db")
db = SQLite3::Database.new(DB_PATH)
db.execute("PRAGMA journal_mode=WAL")

db.execute(<<~SQL)
  CREATE TABLE IF NOT EXISTS configs (
    name       TEXT PRIMARY KEY,
    config     TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
SQL

demo_config = {
  settings: {
    listType: "ul",
    menuTimeout: 5000,
  },
  macros: {
    cars: { linkItems: "vwbug, bmwe36" },
    nycbridges: { linkItems: ".nyc + .bridge" },
  },
  allLinks: {
    vwbug: {
      label: "VW Bug — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Volkswagen_Beetle",
      tags: %w[car vw germany],
    },
    bmwe36: {
      label: "BMW E36 — Wikipedia",
      url: "https://en.wikipedia.org/wiki/BMW_3_Series_(E36)",
      tags: %w[car bmw germany],
    },
    miata: {
      label: "Mazda Miata — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Mazda_MX-5",
      tags: %w[car mazda japan],
    },
    brooklyn: {
      label: "Brooklyn Bridge",
      url: "https://en.wikipedia.org/wiki/Brooklyn_Bridge",
      tags: %w[nyc bridge landmark],
    },
    manhattan: {
      label: "Manhattan Bridge",
      url: "https://en.wikipedia.org/wiki/Manhattan_Bridge",
      tags: %w[nyc bridge],
    },
    highline: {
      label: "The High Line",
      url: "https://en.wikipedia.org/wiki/High_Line",
      tags: %w[nyc park landmark],
    },
    centralpark: {
      label: "Central Park",
      url: "https://en.wikipedia.org/wiki/Central_Park",
      tags: %w[nyc park],
    },
    goldengate: {
      label: "Golden Gate Bridge",
      url: "https://en.wikipedia.org/wiki/Golden_Gate_Bridge",
      tags: %w[sf bridge landmark],
    },
    dolores: {
      label: "Dolores Park",
      url: "https://en.wikipedia.org/wiki/Dolores_Park",
      tags: %w[sf park],
    },
    aqus: {
      label: "Aqus Cafe",
      url: "https://aqus.com",
      tags: %w[coffee sf],
    },
    bluebottle: {
      label: "Blue Bottle Coffee",
      url: "https://bluebottlecoffee.com",
      tags: %w[coffee sf nyc],
    },
    acre: {
      label: "Acre Coffee",
      url: "https://acrecoffee.com",
      tags: %w[coffee],
    },
  },
}

db.execute(<<~SQL, ["demo", JSON.generate(demo_config)])
  INSERT OR REPLACE INTO configs (name, config, created_at, updated_at)
  VALUES (?, ?, datetime('now'), datetime('now'))
SQL

puts 'Seeded "demo" config into alap.db'
db.close
