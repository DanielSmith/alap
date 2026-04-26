/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 *
 * Browser-side config for the Obsidian example. The real `obsidian`
 * protocol config lives in server.mjs — what ships to the browser is
 * a thin proxy that posts expressions to /api/obsidian/query. No vault
 * path, no API key, no filesystem access ever lands on the client.
 */

export const demoConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },
  macros: {},
  allLinks: {},
};
