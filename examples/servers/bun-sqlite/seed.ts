/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Database } from "bun:sqlite";
import { join } from "path";

const db = new Database(join(import.meta.dir, "alap.db"));
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS configs (
    name       TEXT PRIMARY KEY,
    config     TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const demoConfig = {
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
      tags: ["car", "vw", "germany"],
    },
    bmwe36: {
      label: "BMW E36 — Wikipedia",
      url: "https://en.wikipedia.org/wiki/BMW_3_Series_(E36)",
      tags: ["car", "bmw", "germany"],
    },
    miata: {
      label: "Mazda Miata — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Mazda_MX-5",
      tags: ["car", "mazda", "japan"],
    },
    brooklyn: {
      label: "Brooklyn Bridge",
      url: "https://en.wikipedia.org/wiki/Brooklyn_Bridge",
      tags: ["nyc", "bridge", "landmark"],
    },
    manhattan: {
      label: "Manhattan Bridge",
      url: "https://en.wikipedia.org/wiki/Manhattan_Bridge",
      tags: ["nyc", "bridge"],
    },
    highline: {
      label: "The High Line",
      url: "https://en.wikipedia.org/wiki/High_Line",
      tags: ["nyc", "park", "landmark"],
    },
    centralpark: {
      label: "Central Park",
      url: "https://en.wikipedia.org/wiki/Central_Park",
      tags: ["nyc", "park"],
    },
    goldengate: {
      label: "Golden Gate Bridge",
      url: "https://en.wikipedia.org/wiki/Golden_Gate_Bridge",
      tags: ["sf", "bridge", "landmark"],
    },
    dolores: {
      label: "Dolores Park",
      url: "https://en.wikipedia.org/wiki/Dolores_Park",
      tags: ["sf", "park"],
    },
    aqus: {
      label: "Aqus Cafe",
      url: "https://aqus.com",
      tags: ["coffee", "sf"],
    },
    bluebottle: {
      label: "Blue Bottle Coffee",
      url: "https://bluebottlecoffee.com",
      tags: ["coffee", "sf", "nyc"],
    },
    acre: {
      label: "Acre Coffee",
      url: "https://acrecoffee.com",
      tags: ["coffee"],
    },
  },
};

db.prepare(`
  INSERT OR REPLACE INTO configs (name, config, created_at, updated_at)
  VALUES (?, ?, datetime('now'), datetime('now'))
`).run("demo", JSON.stringify(demoConfig));

console.log('Seeded "demo" config into alap.db');
db.close();
