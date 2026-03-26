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

import type { AlapConfig } from '../../src/core/types';

export const extendedTestConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    cars: { linkItems: 'vwbug, bmwe36' },
    nycbridges: { linkItems: '.nyc + .bridge' },
    everything: { linkItems: '.nyc | .sf' },
    worldlandmarks: { linkItems: '.landmark' },
    cityparks: { linkItems: '.park' },
    citybridges: { linkItems: '.bridge' },
    scifi: { linkItems: '.scifi' },
    series: { linkItems: '.series' },
    movienight: { linkItems: '.movie' },
    foodies: { linkItems: '.food' },
    startrek: { linkItems: '.trek' },
    starwars: { linkItems: '.sw' },
  },

  allLinks: {
    // Original Cars
    vwbug: {
      label: 'VW Bug',
      url: 'https://example.com/vwbug',
      tags: ['car', 'vw', 'germany'],
    },
    bmwe36: {
      label: 'BMW E36',
      url: 'https://example.com/bmwe36',
      tags: ['car', 'bmw', 'germany'],
    },
    miata: {
      label: 'Mazda Miata',
      url: 'https://example.com/miata',
      tags: ['car', 'mazda', 'japan'],
    },

    // NYC
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://example.com/brooklyn',
      tags: ['nyc', 'bridge', 'landmark'],
    },
    manhattan: {
      label: 'Manhattan Bridge',
      url: 'https://example.com/manhattan',
      tags: ['nyc', 'bridge'],
    },
    highline: {
      label: 'The High Line',
      url: 'https://example.com/highline',
      tags: ['nyc', 'park', 'landmark'],
    },
    centralpark: {
      label: 'Central Park',
      url: 'https://example.com/centralpark',
      tags: ['nyc', 'park'],
    },

    // SF
    goldengate: {
      label: 'Golden Gate',
      url: 'https://example.com/goldengate',
      tags: ['sf', 'bridge', 'landmark'],
    },
    dolores: {
      label: 'Dolores Park',
      url: 'https://example.com/dolores',
      tags: ['sf', 'park'],
    },

    // Boston
    zakim: {
      label: 'Zakim Bridge',
      url: 'https://example.com/zakim',
      tags: ['boston', 'bridge', 'landmark'],
    },
    publicgarden: {
      label: 'Boston Public Garden',
      url: 'https://example.com/publicgarden',
      tags: ['boston', 'park', 'landmark'],
    },
    bostoncommon: {
      label: 'Boston Common',
      url: 'https://example.com/common',
      tags: ['boston', 'park'],
    },

    // Los Angeles
    hollywood: {
      label: 'Hollywood Sign',
      url: 'https://example.com/hollywood',
      tags: ['losangeles', 'landmark'],
    },
    santamonica: {
      label: 'Santa Monica Pier',
      url: 'https://example.com/santamonica',
      tags: ['losangeles', 'landmark', 'beach'],
    },
    griffithpark: {
      label: 'Griffith Park',
      url: 'https://example.com/griffith',
      tags: ['losangeles', 'park'],
    },
    echopark: {
      label: 'Echo Park',
      url: 'https://example.com/echopark',
      tags: ['losangeles', 'park'],
    },

    // Austin
    pennybacker: {
      label: 'Pennybacker Bridge',
      url: 'https://example.com/pennybacker',
      tags: ['austin', 'bridge', 'landmark'],
    },
    ladybirdlake: {
      label: 'Lady Bird Lake',
      url: 'https://example.com/ladybird',
      tags: ['austin', 'park'],
    },
    zilkerpark: {
      label: 'Zilker Park',
      url: 'https://example.com/zilker',
      tags: ['austin', 'park'],
    },

    // Shanghai
    thebund: {
      label: 'The Bund',
      url: 'https://example.com/bund',
      tags: ['shanghai', 'landmark'],
    },
    orientalpearl: {
      label: 'Oriental Pearl Tower',
      url: 'https://example.com/orientalpearl',
      tags: ['shanghai', 'landmark'],
    },
    centurypark: {
      label: 'Century Park',
      url: 'https://example.com/centurypark',
      tags: ['shanghai', 'park'],
    },
    fuxingpark: {
      label: 'Fuxing Park',
      url: 'https://example.com/fuxingpark',
      tags: ['shanghai', 'park'],
    },

    // London
    towerbridge: {
      label: 'Tower Bridge',
      url: 'https://example.com/towerbridge',
      tags: ['london', 'bridge', 'landmark'],
    },
    londonbridge: {
      label: 'London Bridge',
      url: 'https://example.com/londonbridge',
      tags: ['london', 'bridge'],
    },
    westminsterbridge: {
      label: 'Westminster Bridge',
      url: 'https://example.com/westminster',
      tags: ['london', 'bridge', 'landmark'],
    },
    hydepark: {
      label: 'Hyde Park',
      url: 'https://example.com/hydepark',
      tags: ['london', 'park'],
    },
    regentspark: {
      label: "Regent's Park",
      url: 'https://example.com/regentspark',
      tags: ['london', 'park'],
    },

    // Melbourne
    fedsquare: {
      label: 'Federation Square',
      url: 'https://example.com/fedsquare',
      tags: ['melbourne', 'landmark'],
    },
    boltebridge: {
      label: 'Bolte Bridge',
      url: 'https://example.com/bolte',
      tags: ['melbourne', 'bridge'],
    },
    rbgmelbourne: {
      label: 'Royal Botanic Gardens Melbourne',
      url: 'https://example.com/rbgmel',
      tags: ['melbourne', 'park', 'landmark'],
    },
    fitzroygardens: {
      label: 'Fitzroy Gardens',
      url: 'https://example.com/fitzroy',
      tags: ['melbourne', 'park'],
    },

    // Sydney
    harbourbridge: {
      label: 'Sydney Harbour Bridge',
      url: 'https://example.com/harbourbridge',
      tags: ['sydney', 'bridge', 'landmark'],
    },
    operahouse: {
      label: 'Sydney Opera House',
      url: 'https://example.com/operahouse',
      tags: ['sydney', 'landmark'],
    },
    rbgsydney: {
      label: 'Royal Botanic Gardens Sydney',
      url: 'https://example.com/rbgsyd',
      tags: ['sydney', 'park'],
    },
    hydeparksydney: {
      label: 'Hyde Park Sydney',
      url: 'https://example.com/hydeparksyd',
      tags: ['sydney', 'park'],
    },

    // Monaco
    casinomontecarlo: {
      label: 'Casino de Monte-Carlo',
      url: 'https://example.com/casino',
      tags: ['monaco', 'landmark'],
    },
    princessgracerosegarden: {
      label: 'Princess Grace Rose Garden',
      url: 'https://example.com/rosegarden',
      tags: ['monaco', 'park'],
    },

    // Paris
    eiffel: {
      label: 'Eiffel Tower',
      url: 'https://example.com/eiffel',
      tags: ['paris', 'landmark'],
    },
    pontneuf: {
      label: 'Pont Neuf',
      url: 'https://example.com/pontneuf',
      tags: ['paris', 'bridge', 'landmark'],
    },
    tuileries: {
      label: 'Tuileries Garden',
      url: 'https://example.com/tuileries',
      tags: ['paris', 'park', 'landmark'],
    },
    luxembourg: {
      label: 'Luxembourg Garden',
      url: 'https://example.com/luxembourg',
      tags: ['paris', 'park'],
    },

    // Berlin
    brandenburg: {
      label: 'Brandenburg Gate',
      url: 'https://example.com/brandenburg',
      tags: ['berlin', 'landmark'],
    },
    tiergarten: {
      label: 'Tiergarten',
      url: 'https://example.com/tiergarten',
      tags: ['berlin', 'park'],
    },
    tempelhof: {
      label: 'Tempelhofer Feld',
      url: 'https://example.com/tempelhof',
      tags: ['berlin', 'park'],
    },

    // Coffee
    aqus: {
      label: 'Aqus Cafe',
      url: 'https://example.com/aqus',
      tags: ['coffee', 'sf'],
    },
    bluebottle: {
      label: 'Blue Bottle',
      url: 'https://example.com/bluebottle',
      tags: ['coffee', 'sf', 'nyc'],
    },
    acre: {
      label: 'Acre Coffee',
      url: 'https://example.com/acre',
      tags: ['coffee'],
    },

    // Food
    joespizza: {
      label: "Joe's Pizza",
      url: 'https://example.com/joespizza',
      tags: ['pizza', 'nyc', 'food'],
    },
    mozza: {
      label: 'Pizzeria Mozza',
      url: 'https://example.com/mozza',
      tags: ['pizza', 'losangeles', 'food'],
    },
    russanddaughters: {
      label: 'Russ & Daughters',
      url: 'https://example.com/russanddaughters',
      tags: ['bagels', 'nyc', 'food'],
    },
    absolutebagels: {
      label: 'Absolute Bagels',
      url: 'https://example.com/absolutebagels',
      tags: ['bagels', 'nyc', 'food'],
    },
    pastaadagio: {
      label: 'Pasta Adagio',
      url: 'https://example.com/pastaadagio',
      tags: ['pasta', 'melbourne', 'food'],
    },

    // Movie Genres
    godfather: {
      label: 'The Godfather',
      url: 'https://example.com/godfather',
      tags: ['drama', 'movie'],
    },
    spiritedaway: {
      label: 'Spirited Away',
      url: 'https://example.com/spiritedaway',
      tags: ['anime', 'movie', 'japan'],
    },
    akira: {
      label: 'Akira',
      url: 'https://example.com/akira',
      tags: ['anime', 'movie', 'japan', 'scifi'],
    },
    airplane: {
      label: 'Airplane!',
      url: 'https://example.com/airplane',
      tags: ['comedy', 'movie'],
    },
    superbad: {
      label: 'Superbad',
      url: 'https://example.com/superbad',
      tags: ['comedy', 'movie'],
    },
    montypython: {
      label: 'Monty Python and the Holy Grail',
      url: 'https://example.com/montypython',
      tags: ['comedy', 'movie'],
    },
    diehard: {
      label: 'Die Hard',
      url: 'https://example.com/diehard',
      tags: ['action', 'movie'],
    },
    madmax: {
      label: 'Mad Max: Fury Road',
      url: 'https://example.com/madmax',
      tags: ['action', 'movie'],
    },
    johnwick: {
      label: 'John Wick',
      url: 'https://example.com/johnwick',
      tags: ['action', 'movie'],
    },
    bladerunner: {
      label: 'Blade Runner',
      url: 'https://example.com/bladerunner',
      tags: ['scifi', 'movie', 'losangeles'],
    },

    // Series
    got: {
      label: 'Game of Thrones',
      url: 'https://example.com/got',
      tags: ['series', 'drama', 'fantasy'],
    },
    foundation: {
      label: 'Foundation',
      url: 'https://example.com/foundation',
      tags: ['series', 'scifi'],
    },
    lazarus: {
      label: 'Lazarus',
      url: 'https://example.com/lazarus',
      tags: ['series', 'anime'],
    },

    // Star Trek
    trek_tos: {
      label: 'Star Trek: The Original Series',
      url: 'https://example.com/trek_tos',
      tags: ['series', 'scifi', 'trek'],
    },
    trek_tng: {
      label: 'Star Trek: The Next Generation',
      url: 'https://example.com/trek_tng',
      tags: ['series', 'scifi', 'trek'],
    },
    trek_ds9: {
      label: 'Star Trek: Deep Space Nine',
      url: 'https://example.com/trek_ds9',
      tags: ['series', 'scifi', 'trek'],
    },
    trek_voy: {
      label: 'Star Trek: Voyager',
      url: 'https://example.com/trek_voy',
      tags: ['series', 'scifi', 'trek'],
    },
    trek_ent: {
      label: 'Star Trek: Enterprise',
      url: 'https://example.com/trek_ent',
      tags: ['series', 'scifi', 'trek'],
    },
    trek_dis: {
      label: 'Star Trek: Discovery',
      url: 'https://example.com/trek_dis',
      tags: ['series', 'scifi', 'trek'],
    },
    trek_pic: {
      label: 'Star Trek: Picard',
      url: 'https://example.com/trek_pic',
      tags: ['series', 'scifi', 'trek'],
    },
    trek_snw: {
      label: 'Star Trek: Strange New Worlds',
      url: 'https://example.com/trek_snw',
      tags: ['series', 'scifi', 'trek'],
    },

    // Star Wars
    sw_mando: {
      label: 'The Mandalorian',
      url: 'https://example.com/sw_mando',
      tags: ['series', 'scifi', 'sw'],
    },
    sw_ahsoka: {
      label: 'Ahsoka',
      url: 'https://example.com/sw_ahsoka',
      tags: ['series', 'scifi', 'sw'],
    },
    sw_andor: {
      label: 'Andor',
      url: 'https://example.com/sw_andor',
      tags: ['series', 'scifi', 'sw'],
    },
    sw_obiwan: {
      label: 'Obi-Wan Kenobi',
      url: 'https://example.com/sw_obiwan',
      tags: ['series', 'scifi', 'sw'],
    },
    sw_badbatch: {
      label: 'The Bad Batch',
      url: 'https://example.com/sw_badbatch',
      tags: ['series', 'scifi', 'sw', 'anime'],
    },
    sw_clonewars: {
      label: 'The Clone Wars',
      url: 'https://example.com/sw_clonewars',
      tags: ['series', 'scifi', 'sw', 'anime'],
    },
  },
};
