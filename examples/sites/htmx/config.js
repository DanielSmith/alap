/**
 * Alap configuration for the htmx example.
 * SPDX-License-Identifier: Apache-2.0
 */

window.alapConfig = {
  settings: { listType: "ul", menuTimeout: 5000, placement: "S" },
  macros: {
    nycfood:    { linkItems: ".nyc + .food" },
    nycbridges: { linkItems: ".nyc + .bridge" },
    cars:       { linkItems: ".car" },
    favorites:  { linkItems: "golden, bluebottle, highline" }
  },
  allLinks: {
    golden:      { label: "Golden Gate Bridge", url: "https://en.wikipedia.org/wiki/Golden_Gate_Bridge", tags: ["bridge", "sf", "landmark"] },
    brooklyn:    { label: "Brooklyn Bridge",    url: "https://en.wikipedia.org/wiki/Brooklyn_Bridge",   tags: ["bridge", "nyc", "landmark"] },
    manhattan:   { label: "Manhattan Bridge",   url: "https://en.wikipedia.org/wiki/Manhattan_Bridge",  tags: ["bridge", "nyc"] },
    centralpark: { label: "Central Park",       url: "https://en.wikipedia.org/wiki/Central_Park",      tags: ["nyc", "park"] },
    highline:    { label: "The High Line",      url: "https://en.wikipedia.org/wiki/High_Line",         tags: ["nyc", "park"] },
    bluebottle:  { label: "Blue Bottle Coffee", url: "https://bluebottlecoffee.com",                    tags: ["coffee", "sf"] },
    stumptown:   { label: "Stumptown Coffee",   url: "https://stumptowncoffee.com",                     tags: ["coffee", "portland"] },
    aqus:        { label: "Aqus Cafe",          url: "https://aqus.com",                                tags: ["coffee", "petaluma"] },
    joes:        { label: "Joe's Pizza",        url: "https://en.wikipedia.org/wiki/Joe%27s_Pizza",     tags: ["nyc", "food"] },
    katz:        { label: "Katz's Deli",        url: "https://en.wikipedia.org/wiki/Katz%27s_Delicatessen", tags: ["nyc", "food"] },
    vwbug:       { label: "VW Beetle",          url: "https://en.wikipedia.org/wiki/Volkswagen_Beetle", tags: ["car", "classic"] },
    bmwe36:      { label: "BMW E36",            url: "https://en.wikipedia.org/wiki/BMW_3_Series_(E36)", tags: ["car"] }
  }
};
