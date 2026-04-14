/**
 * Alap configuration for the htmx example.
 * SPDX-License-Identifier: Apache-2.0
 */

window.alapConfig = {
  settings: { listType: "ul", menuTimeout: 5000 },
  macros: {
    nycfood:    { linkItems: ".nyc + .food" },
    nycbridges: { linkItems: ".nyc + .bridge" },
    cars:       { linkItems: ".car" },
    favorites:  { linkItems: "golden, bluebottle, highline, pikeplace, stumptown" }
  },
  allLinks: {
    // Bridges
    golden:      { label: "Golden Gate Bridge",   url: "https://en.wikipedia.org/wiki/Golden_Gate_Bridge",   tags: ["bridge", "sf", "landmark"] },
    brooklyn:    { label: "Brooklyn Bridge",      url: "https://en.wikipedia.org/wiki/Brooklyn_Bridge",     tags: ["bridge", "nyc", "landmark"] },
    manhattan:   { label: "Manhattan Bridge",     url: "https://en.wikipedia.org/wiki/Manhattan_Bridge",    tags: ["bridge", "nyc"] },
    williamsburg:{ label: "Williamsburg Bridge",  url: "https://en.wikipedia.org/wiki/Williamsburg_Bridge", tags: ["bridge", "nyc"] },
    baybridge:   { label: "Bay Bridge",           url: "https://en.wikipedia.org/wiki/San_Francisco%E2%80%93Oakland_Bay_Bridge", tags: ["bridge", "sf"] },

    // Parks
    centralpark: { label: "Central Park",         url: "https://en.wikipedia.org/wiki/Central_Park",        tags: ["nyc", "park", "landmark"] },
    highline:    { label: "The High Line",        url: "https://en.wikipedia.org/wiki/High_Line",           tags: ["nyc", "park"] },
    prospect:    { label: "Prospect Park",        url: "https://en.wikipedia.org/wiki/Prospect_Park_(Brooklyn)", tags: ["nyc", "park"] },
    dolores:     { label: "Dolores Park",         url: "https://en.wikipedia.org/wiki/Dolores_Park",        tags: ["sf", "park"] },
    presidio:    { label: "The Presidio",         url: "https://en.wikipedia.org/wiki/Presidio_of_San_Francisco", tags: ["sf", "park", "landmark"] },

    // Coffee — SF
    bluebottle:  { label: "Blue Bottle Coffee",   url: "https://bluebottlecoffee.com",                      tags: ["coffee", "sf", "nyc"] },
    ritual:      { label: "Ritual Coffee",        url: "https://ritualcoffee.com",                          tags: ["coffee", "sf"] },
    sightglass:  { label: "Sightglass Coffee",    url: "https://sightglasscoffee.com",                     tags: ["coffee", "sf"] },
    aqus:        { label: "Aqus Cafe",            url: "https://aqus.com",                                  tags: ["coffee", "petaluma"] },

    // Coffee — Portland
    stumptown:   { label: "Stumptown Coffee",     url: "https://stumptowncoffee.com",                       tags: ["coffee", "portland"] },
    heartroasters:{ label: "Heart Coffee",        url: "https://heartroasters.com",                         tags: ["coffee", "portland"] },
    coava:       { label: "Coava Coffee",         url: "https://coavacoffee.com",                           tags: ["coffee", "portland"] },

    // Coffee — Seattle
    pikeplace:   { label: "Pike Place (original)",url: "https://en.wikipedia.org/wiki/Pike_Place_Market",   tags: ["coffee", "seattle", "landmark"] },
    victrola:    { label: "Victrola Coffee",      url: "https://victrolacoffee.com",                        tags: ["coffee", "seattle"] },

    // Food — NYC
    joes:        { label: "Joe's Pizza",          url: "https://en.wikipedia.org/wiki/Joe%27s_Pizza",       tags: ["nyc", "food"] },
    katz:        { label: "Katz's Deli",          url: "https://en.wikipedia.org/wiki/Katz%27s_Delicatessen", tags: ["nyc", "food"] },
    russ:        { label: "Russ & Daughters",     url: "https://en.wikipedia.org/wiki/Russ_%26_Daughters",  tags: ["nyc", "food", "landmark"] },
    halal:       { label: "Halal Guys",           url: "https://en.wikipedia.org/wiki/The_Halal_Guys",      tags: ["nyc", "food"] },

    // Cars
    vwbug:       { label: "VW Beetle",            url: "https://en.wikipedia.org/wiki/Volkswagen_Beetle",   tags: ["car", "classic"] },
    bmwe36:      { label: "BMW E36",              url: "https://en.wikipedia.org/wiki/BMW_3_Series_(E36)",  tags: ["car"] },
    miata:       { label: "Mazda Miata",          url: "https://en.wikipedia.org/wiki/Mazda_MX-5",         tags: ["car", "classic"] },
    porsche964:  { label: "Porsche 964",          url: "https://en.wikipedia.org/wiki/Porsche_964",         tags: ["car", "classic"] }
  }
};
