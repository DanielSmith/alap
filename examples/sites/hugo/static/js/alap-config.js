/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

window.alapConfig = {
  settings: { listType: "ul", menuTimeout: 5000, placement: "SE", placementGap: 6 },

  macros: {
    coffee:      { linkItems: ".coffee" },
    nyc_bridges: { linkItems: ".nyc + .bridge" },
    all_bridges: { linkItems: ".bridge" },
    favorites:   { linkItems: "goldengate, bluebottle, highline" },
    nyc_parks:   { linkItems: ".nyc + .park" },
    sf_spots:    { linkItems: ".sf" },
    cars:        { linkItems: ".car" },
    german_cars: { linkItems: ".car + .germany" }
  },

  allLinks: {
    brooklyn:    { label: "Brooklyn Bridge",    url: "https://en.wikipedia.org/wiki/Brooklyn_Bridge",    tags: ["nyc", "bridge", "landmark"] },
    manhattan:   { label: "Manhattan Bridge",   url: "https://en.wikipedia.org/wiki/Manhattan_Bridge",   tags: ["nyc", "bridge"] },
    goldengate:  { label: "Golden Gate Bridge", url: "https://en.wikipedia.org/wiki/Golden_Gate_Bridge", tags: ["sf", "bridge", "landmark"] },
    highline:    { label: "The High Line",      url: "https://en.wikipedia.org/wiki/High_Line",          tags: ["nyc", "park", "landmark"] },
    centralpark: { label: "Central Park",       url: "https://en.wikipedia.org/wiki/Central_Park",       tags: ["nyc", "park"] },
    dolores:     { label: "Dolores Park",       url: "https://en.wikipedia.org/wiki/Dolores_Park",       tags: ["sf", "park", "landmark"] },
    bluebottle:  { label: "Blue Bottle Coffee", url: "https://bluebottlecoffee.com",                     tags: ["coffee", "sf", "nyc"] },
    ritual:      { label: "Ritual Coffee",      url: "https://ritualcoffee.com",                         tags: ["coffee", "sf"] },
    birch:       { label: "Birch Coffee",       url: "https://birchcoffee.com",                          tags: ["coffee", "nyc"] },
    stumptown:   { label: "Stumptown Coffee",   url: "https://stumptowncoffee.com",                      tags: ["coffee", "portland"] },
    coava:       { label: "Coava Coffee",       url: "https://coavacoffee.com",                          tags: ["coffee", "portland"] },
    elm:         { label: "Elm Coffee",         url: "https://elmcoffeeroasters.com",                    tags: ["coffee", "seattle"] },
    victrola:    { label: "Victrola Coffee",    url: "https://victrolacoffee.com",                       tags: ["coffee", "seattle"] },
    taylor:      { label: "Taylor Lane",        url: "https://taylorlane.com",                           tags: ["coffee", "sonoma"] },
    acre:        { label: "Acre Coffee",        url: "https://acrecoffee.com",                           tags: ["coffee", "sonoma"] },
    vwbug:       { label: "VW Bug",             url: "https://en.wikipedia.org/wiki/Volkswagen_Beetle",  tags: ["car", "germany"] },
    bmwe36:      { label: "BMW E36",            url: "https://en.wikipedia.org/wiki/BMW_3_Series_(E36)", tags: ["car", "germany"] },
    miata:       { label: "Mazda Miata",        url: "https://en.wikipedia.org/wiki/Mazda_MX-5",         tags: ["car", "japan"] }
  }
};
