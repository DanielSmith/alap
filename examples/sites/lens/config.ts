/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AlapConfig } from 'alap/core';

export const demoConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  macros: {
    favorites: { linkItems: 'goldengate, bluebottle, highline, operahouse, spaceneedle' },
    everything: { linkItems: '.bridge, .park, .coffee, .landmark' },
  },

  allLinks: {
    // --- NYC ---

    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['nyc', 'bridge', 'landmark'],
      description: 'Opened in 1883, connecting Manhattan and Brooklyn over the East River. One of the oldest roadway bridges in the United States. Designed by John Augustus Roebling, the bridge took 14 years to build and was the longest suspension bridge in the world at the time of its completion.',
      thumbnail: '../shared/img/brooklyn.jpg',
      meta: {
        photoCredit: 'Hannes Richter',
        photoCreditUrl: 'https://unsplash.com/@harimedia',
        opened: 1883,
        length: '1,825 m',
        architect: 'John Augustus Roebling',
        borough: 'Manhattan / Brooklyn',
        designations: ['National Historic Landmark', 'NYC Landmark', 'National Register of Historic Places'],
      },
    },
    manhattan: {
      label: 'Manhattan Bridge',
      url: 'https://en.wikipedia.org/wiki/Manhattan_Bridge',
      tags: ['nyc', 'bridge'],
      description: 'A suspension bridge crossing the East River, connecting Lower Manhattan with Downtown Brooklyn.',
      thumbnail: '../shared/img/manhattan.jpg',
      meta: {
        photoCredit: 'YM',
        photoCreditUrl: 'https://unsplash.com/@ymoran',
        opened: 1909,
        length: '2,089 m',
      },
    },
    highline: {
      label: 'The High Line',
      url: 'https://en.wikipedia.org/wiki/High_Line',
      tags: ['nyc', 'park', 'landmark'],
      description: 'An elevated linear park built on a historic freight rail line on the west side of Manhattan.',
      thumbnail: '../shared/img/highline.jpg',
      meta: {
        photoCredit: 'lo lindo',
        photoCreditUrl: 'https://unsplash.com/@lolindo',
        opened: 2009,
        length: '2.33 km',
        neighborhood: 'Chelsea / Meatpacking District',
        visitors_per_year: '8 million',
      },
    },
    centralpark: {
      label: 'Central Park',
      url: 'https://en.wikipedia.org/wiki/Central_Park',
      tags: ['nyc', 'park'],
      description: 'An 843-acre urban park in the heart of Manhattan, the most visited urban park in the United States.',
      thumbnail: '../shared/img/centralpark.jpg',
      meta: {
        photoCredit: 'Harry Gillen',
        photoCreditUrl: 'https://unsplash.com/@gillenha',
        area: '843 acres',
        established: 1857,
        free_admission: true,
        visitors_per_year: '42 million',
        designers: ['Frederick Law Olmsted', 'Calvert Vaux'],
      },
    },

    // --- San Francisco ---

    goldengate: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      tags: ['sf', 'bridge', 'landmark'],
      description: 'Spanning the Golden Gate strait, this 1937 suspension bridge is an internationally recognized symbol of San Francisco and California.',
      thumbnail: '../shared/img/goldengate.jpg',
      meta: {
        photoCredit: 'Maarten van den Heuvel',
        photoCreditUrl: 'https://unsplash.com/@mvdheuvel',
        opened: 1937,
        length: '2,737 m',
        architect: 'Joseph Strauss',
        color: 'International Orange',
      },
    },
    dolores: {
      label: 'Dolores Park',
      url: 'https://en.wikipedia.org/wiki/Dolores_Park',
      tags: ['sf', 'park'],
      description: 'A city park in the Mission District with views of downtown San Francisco and the East Bay.',
      thumbnail: '../shared/img/dolores.jpg',
      meta: {
        photoCredit: 'Leo Korman',
        photoCreditUrl: 'https://unsplash.com/@leokorman',
      },
    },

    // --- London ---

    towerbridge: {
      label: 'Tower Bridge',
      url: 'https://en.wikipedia.org/wiki/Tower_Bridge',
      tags: ['london', 'bridge', 'landmark'],
      description: 'A combined bascule and suspension bridge over the Thames, built in 1894 with Victorian Gothic towers.',
      thumbnail: '../shared/img/towerbridge.jpg',
      meta: {
        photoCredit: 'Flavio Vallone',
        photoCreditUrl: 'https://unsplash.com/@fotartistadigitale',
        opened: 1894,
        length: '244 m',
        architect: 'Horace Jones',
        style: 'Victorian Gothic',
      },
    },
    hydePark: {
      label: 'Hyde Park',
      url: 'https://en.wikipedia.org/wiki/Hyde_Park,_London',
      tags: ['london', 'park'],
      description: 'One of London\'s Royal Parks covering 350 acres, home to the Serpentine lake and Speakers\' Corner.',
      thumbnail: '../shared/img/hydepark.jpg',
      meta: {
        photoCredit: 'Marco Chilese',
        photoCreditUrl: 'https://unsplash.com/@chmarco',
      },
    },

    // --- Berlin ---

    oberbaum: {
      label: 'Oberbaum Bridge',
      url: 'https://en.wikipedia.org/wiki/Oberbaum_Bridge',
      tags: ['berlin', 'bridge', 'landmark'],
      description: 'A double-deck bridge over the Spree with Gothic Revival towers, once a Cold War border crossing between East and West Berlin.',
      thumbnail: '../shared/img/oberbaum.jpg',
      meta: {
        photoCredit: 'derek braithwaite',
        photoCreditUrl: 'https://unsplash.com/@snapdb',
        opened: 1896,
        style: 'Gothic Revival',
      },
    },
    kaiserwilhelm: {
      label: 'Kaiser Wilhelm Memorial Church',
      url: 'https://en.wikipedia.org/wiki/Kaiser_Wilhelm_Memorial_Church',
      tags: ['berlin', 'landmark'],
      description: 'A war-damaged Romanesque Revival church on the Kurf\u00fcrstendamm, preserved as a memorial against war and destruction.',
      thumbnail: '../shared/img/kaiserwilhelm.jpg',
      meta: {
        photoCredit: 'Gregor Samimi',
        photoCreditUrl: 'https://unsplash.com/@gregorsamimi',
      },
    },

    // --- Paris ---

    pontneuf: {
      label: 'Pont Neuf',
      url: 'https://en.wikipedia.org/wiki/Pont_Neuf',
      tags: ['paris', 'bridge', 'landmark'],
      description: 'The oldest standing bridge across the Seine in Paris, completed in 1607 despite its name meaning "New Bridge."',
      thumbnail: '../shared/img/pontneuf.jpg',
      meta: {
        photoCredit: 'Rachel Calvo',
        photoCreditUrl: 'https://unsplash.com/@rachelcalvophoto',
        opened: 1607,
      },
    },
    luxembourg: {
      label: 'Luxembourg Gardens',
      url: 'https://en.wikipedia.org/wiki/Jardin_du_Luxembourg',
      tags: ['paris', 'park'],
      description: 'A 23-hectare palace garden in the 6th arrondissement, inspired by the Boboli Gardens in Florence.',
      thumbnail: '../shared/img/luxembourg.jpg',
      meta: {
        photoCredit: 'Kamilla Isalieva',
        photoCreditUrl: 'https://unsplash.com/@kamillaisalieva',
      },
    },

    // --- Chicago ---

    cloudgate: {
      label: 'Cloud Gate (The Bean)',
      url: 'https://en.wikipedia.org/wiki/Cloud_Gate',
      tags: ['chicago', 'landmark'],
      description: 'Anish Kapoor\'s polished steel sculpture in Millennium Park, reflecting Chicago\'s skyline in its liquid mercury surface.',
      thumbnail: '../shared/img/cloudgate.jpg',
      meta: {
        photoCredit: 'Vanessa Sezini',
        photoCreditUrl: 'https://unsplash.com/@vsezini',
        artist: 'Anish Kapoor',
        unveiled: 2006,
      },
    },
    millenniumpark: {
      label: 'Millennium Park',
      url: 'https://en.wikipedia.org/wiki/Millennium_Park',
      tags: ['chicago', 'park', 'landmark'],
      description: 'A 24.5-acre public park in the Loop featuring Cloud Gate, Crown Fountain, and the Jay Pritzker Pavilion.',
      thumbnail: '../shared/img/millenniumpark.jpg',
      meta: {
        photoCredit: 'Kestner Brae De Vera',
        photoCreditUrl: 'https://unsplash.com/@kbdevera',
        area: '24.5 acres',
        opened: 2004,
      },
    },

    // --- Detroit ---

    ambassadorbridge: {
      label: 'Ambassador Bridge',
      url: 'https://en.wikipedia.org/wiki/Ambassador_Bridge',
      tags: ['detroit', 'bridge'],
      description: 'A suspension bridge connecting Detroit with Windsor, Ontario \u2014 the busiest international border crossing in North America.',
      thumbnail: '../shared/img/ambassadorbridge.jpg',
      meta: {
        photoCredit: 'Brad Switzer',
        photoCreditUrl: 'https://unsplash.com/@mintchap',
        opened: 1929,
        length: '2,286 m',
      },
    },

    // --- Los Angeles ---

    griffith: {
      label: 'Griffith Observatory',
      url: 'https://en.wikipedia.org/wiki/Griffith_Observatory',
      tags: ['la', 'landmark'],
      description: 'An Art Deco observatory on Mount Hollywood offering panoramic views of the LA basin, the Pacific, and the Hollywood Sign.',
      thumbnail: '../shared/img/griffith.jpg',
      meta: {
        photoCredit: 'Venti Views',
        photoCreditUrl: 'https://unsplash.com/@ventiviews',
        opened: 1935,
        style: 'Art Deco',
        free_admission: true,
      },
    },
    venice: {
      label: 'Venice Beach',
      url: 'https://en.wikipedia.org/wiki/Venice,_Los_Angeles',
      tags: ['la', 'landmark'],
      description: 'A 2.5-mile oceanfront boardwalk known for street performers, Muscle Beach, and the eclectic spirit of west LA.',
      thumbnail: '../shared/img/venice.jpg',
      meta: {
        photoCredit: 'Florian Wehde',
        photoCreditUrl: 'https://unsplash.com/@florianwehde',
      },
    },

    // --- Sydney ---

    harbourbridge: {
      label: 'Sydney Harbour Bridge',
      url: 'https://en.wikipedia.org/wiki/Sydney_Harbour_Bridge',
      tags: ['sydney', 'bridge', 'landmark'],
      description: 'The world\'s largest steel arch bridge, connecting Sydney\'s CBD to the North Shore across the harbour since 1932.',
      thumbnail: '../shared/img/harbourbridge.jpg',
      meta: {
        photoCredit: 'Halley Tian',
        photoCreditUrl: 'https://unsplash.com/@stia004',
        opened: 1932,
        length: '1,149 m',
      },
    },
    operahouse: {
      label: 'Sydney Opera House',
      url: 'https://en.wikipedia.org/wiki/Sydney_Opera_House',
      tags: ['sydney', 'landmark'],
      description: 'Jorn Utzon\'s sail-roofed masterpiece on Bennelong Point, a UNESCO World Heritage Site and Australia\'s most famous building.',
      thumbnail: '../shared/img/operahouse.jpg',
      meta: {
        photoCredit: 'Jasper Wilde',
        photoCreditUrl: 'https://unsplash.com/@jasperwilde',
        opened: 1973,
        architect: 'Jorn Utzon',
        style: 'Expressionist Modern',
      },
    },

    // --- Seattle ---

    spaceneedle: {
      label: 'Space Needle',
      url: 'https://en.wikipedia.org/wiki/Space_Needle',
      tags: ['seattle', 'landmark'],
      description: 'Built for the 1962 World\'s Fair, this 605-foot observation tower defines the Seattle skyline.',
      thumbnail: '../shared/img/spaceneedle.jpg',
      meta: {
        photoCredit: 'Andrea Leopardi',
        photoCreditUrl: 'https://unsplash.com/@whatyouhide',
        opened: 1962,
        height: '605 ft',
        architect: 'Edward E. Carlson',
      },
    },
    pikeplace: {
      label: 'Pike Place Market',
      url: 'https://en.wikipedia.org/wiki/Pike_Place_Market',
      tags: ['seattle', 'landmark'],
      description: 'One of the oldest continuously operated public farmers\' markets in the US, opened in 1907 overlooking Elliott Bay.',
      thumbnail: '../shared/img/pikeplace.jpg',
      meta: {
        photoCredit: 'Doctor Tinieblas',
        photoCreditUrl: 'https://unsplash.com/@doctortinieblas',
        opened: 1907,
      },
    },

    // --- Portland ---

    stjohns: {
      label: 'St. Johns Bridge',
      url: 'https://en.wikipedia.org/wiki/St._Johns_Bridge',
      tags: ['portland', 'bridge', 'landmark'],
      description: 'A Gothic Revival suspension bridge spanning the Willamette River, with 400-foot towers inspired by medieval cathedrals.',
      thumbnail: '../shared/img/stjohns.jpg',
      meta: {
        photoCredit: 'Kevin Butz',
        photoCreditUrl: 'https://unsplash.com/@kevin_butz',
        opened: 1931,
        length: '1,207 m',
        style: 'Gothic Revival',
      },
    },
    forestpark: {
      label: 'Forest Park',
      url: 'https://en.wikipedia.org/wiki/Forest_Park_(Portland,_Oregon)',
      tags: ['portland', 'park'],
      description: 'One of the largest urban forests in the US at over 5,200 acres, with 80+ miles of trails within Portland city limits.',
      thumbnail: '../shared/img/forestpark.jpg',
      meta: {
        photoCredit: 'J Lopes',
        photoCreditUrl: 'https://unsplash.com/@offeringofpie',
        area: '5,200 acres',
      },
    },

    // --- Tokyo ---

    rainbowbridge: {
      label: 'Rainbow Bridge',
      url: 'https://en.wikipedia.org/wiki/Rainbow_Bridge_(Tokyo)',
      tags: ['tokyo', 'bridge', 'landmark'],
      description: 'A suspension bridge spanning Tokyo Bay between Shibaura Pier and Odaiba, lit in white at night against the city skyline.',
      thumbnail: '../shared/img/rainbowbridge.jpg',
      meta: {
        photoCredit: 'Se. Tsuchiya',
        photoCreditUrl: 'https://unsplash.com/@s_tsuchiya',
        opened: 1993,
        length: '798 m',
      },
    },
    yoyogi: {
      label: 'Yoyogi Park',
      url: 'https://en.wikipedia.org/wiki/Yoyogi_Park',
      tags: ['tokyo', 'park'],
      description: 'A sprawling green space in Shibuya built on the former Olympic village site, famous for weekend cosplay gatherings and street performers.',
      thumbnail: '../shared/img/yoyogi.jpg',
      meta: {
        photoCredit: 'Andrea Serini',
        photoCreditUrl: 'https://unsplash.com/@andreilsero',
      },
    },

    // --- Seoul ---

    banpo: {
      label: 'Banpo Bridge',
      url: 'https://en.wikipedia.org/wiki/Banpo_Bridge',
      tags: ['seoul', 'bridge', 'landmark'],
      description: 'A double-deck bridge over the Han River featuring the Moonlight Rainbow Fountain, the world\'s longest bridge fountain.',
      thumbnail: '../shared/img/banpo.jpg',
      meta: {
        photoCredit: 'Minku Kang',
        photoCreditUrl: 'https://unsplash.com/@minkus',
        opened: 1982,
      },
    },
    namsan: {
      label: 'Namsan Tower',
      url: 'https://en.wikipedia.org/wiki/N_Seoul_Tower',
      tags: ['seoul', 'landmark'],
      description: 'A communication and observation tower on Namsan Mountain offering 360-degree views of Seoul, famous for its love lock fence.',
      thumbnail: '../shared/img/namsan.jpg',
      meta: {
        photoCredit: 'Venancio Dionela',
        photoCreditUrl: 'https://unsplash.com/@vdionelajr',
        opened: 1969,
        height: '236 m',
      },
    },

    // --- Melbourne ---

    flindersst: {
      label: 'Flinders Street Station',
      url: 'https://en.wikipedia.org/wiki/Flinders_Street_station',
      tags: ['melbourne', 'landmark'],
      description: 'Melbourne\'s iconic Edwardian Baroque railway station at the corner of Flinders and Swanston streets, the city\'s most recognized landmark.',
      thumbnail: '../shared/img/flindersst.jpg',
      meta: {
        photoCredit: 'Ann-Maree Hannon',
        photoCreditUrl: 'https://unsplash.com/@reehannon',
        opened: 1909,
        style: 'Edwardian Baroque',
      },
    },
    royalbotanic: {
      label: 'Royal Botanic Gardens',
      url: 'https://en.wikipedia.org/wiki/Royal_Botanic_Gardens,_Melbourne',
      tags: ['melbourne', 'park', 'landmark'],
      description: 'A 94-acre heritage-listed garden on the south bank of the Yarra, home to over 8,500 plant species since 1846.',
      thumbnail: '../shared/img/royalbotanic.jpg',
      meta: {
        photoCredit: 'John Torcasio',
        photoCreditUrl: 'https://unsplash.com/@johntorcasio',
        area: '94 acres',
        established: 1846,
      },
    },

    // --- Shanghai ---

    nanpu: {
      label: 'Nanpu Bridge',
      url: 'https://en.wikipedia.org/wiki/Nanpu_Bridge',
      tags: ['shanghai', 'bridge'],
      description: 'The first bridge to cross the Huangpu River, known for its spiraling on-ramp that coils like a dragon from the Puxi side.',
      thumbnail: '../shared/img/nanpu.jpg',
      meta: {
        photoCredit: 'Alex Sun',
        photoCreditUrl: 'https://unsplash.com/@sfang2023',
        opened: 1991,
      },
    },
    thebund: {
      label: 'The Bund',
      url: 'https://en.wikipedia.org/wiki/The_Bund',
      tags: ['shanghai', 'landmark'],
      description: 'A waterfront promenade along the Huangpu lined with 52 colonial-era buildings facing the futuristic Pudong skyline across the river.',
      thumbnail: '../shared/img/thebund.jpg',
      meta: {
        photoCredit: 'Edward He',
        photoCreditUrl: 'https://unsplash.com/@bingham008',
      },
    },

    // --- Mumbai ---

    cst: {
      label: 'Chhatrapati Shivaji Terminus',
      url: 'https://en.wikipedia.org/wiki/Chhatrapati_Shivaji_Terminus',
      tags: ['mumbai', 'landmark'],
      description: 'A UNESCO World Heritage Site and one of the busiest railway stations in India, built in Victorian Gothic Revival style in 1888.',
      thumbnail: '../shared/img/cst.jpg',
      meta: {
        photoCredit: 'Darshan Chudasama',
        photoCreditUrl: 'https://unsplash.com/@darsh2311',
        opened: 1888,
        style: 'Victorian Gothic Revival',
      },
    },
    gatewayofindia: {
      label: 'Gateway of India',
      url: 'https://en.wikipedia.org/wiki/Gateway_of_India',
      tags: ['mumbai', 'landmark'],
      description: 'A 26-metre basalt arch on the Mumbai waterfront built in 1924 to commemorate the visit of King George V and Queen Mary.',
      thumbnail: '../shared/img/gatewayofindia.jpg',
      meta: {
        photoCredit: 'Sushant Hembrom',
        photoCreditUrl: 'https://unsplash.com/@susmac007',
        opened: 1924,
        height: '26 m',
      },
    },

    // --- Coffee ---

    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://bluebottlecoffee.com',
      tags: ['coffee', 'sf', 'nyc'],
      description: 'Third-wave coffee roaster founded in Oakland in 2002. Known for single-origin beans and minimalist cafes.',
      thumbnail: '../shared/img/bluebottle.jpg',
      meta: {
        photoCredit: 'Braden Collum',
        photoCreditUrl: 'https://unsplash.com/@bradencollum',
        founded: 2002,
        headquarters: 'Oakland, CA',
        locations: ['San Francisco', 'New York', 'Los Angeles', 'Tokyo', 'Seoul', 'Hong Kong'],
      },
    },
    stumptown: {
      label: 'Stumptown Coffee',
      url: 'https://stumptowncoffee.com',
      tags: ['coffee', 'portland'],
      description: 'Portland-based roaster known for direct trade sourcing and hair bender espresso blend.',
      thumbnail: '../shared/img/stumptown.jpg',
      meta: {
        photoCredit: 'Jordan Ringo',
        photoCreditUrl: 'https://unsplash.com/@jordyringo',
        founded: 1999,
        headquarters: 'Portland, OR',
      },
    },

    // --- Fruit (no URLs, lens-only) ---

    apple: {
      label: 'Apple',
      url: '',
      tags: ['fruit', 'rosaceae'],
      description: 'A widely cultivated tree fruit, rich in fiber and vitamin C.',
      meta: {
        family: 'Rosaceae',
        genus: 'Malus',
        calories: 52,
        sugar: 10.39,
        protein: 0.26,
        fat: 0.17,
        fiber: 2.4,
        vitamin_c: '14% DV',
      },
    },
    banana: {
      label: 'Banana',
      url: '',
      tags: ['fruit', 'musaceae'],
      description: 'An elongated, edible fruit produced by several kinds of large herbaceous flowering plants.',
      meta: {
        family: 'Musaceae',
        genus: 'Musa',
        calories: 89,
        sugar: 12.23,
        protein: 1.09,
        fat: 0.33,
        fiber: 2.6,
        potassium: '358 mg',
      },
    },
    strawberry: {
      label: 'Strawberry',
      url: '',
      tags: ['fruit', 'rosaceae'],
      description: 'A widely grown hybrid species of the genus Fragaria, cultivated worldwide for its fruit.',
      meta: {
        family: 'Rosaceae',
        genus: 'Fragaria',
        calories: 32,
        sugar: 4.89,
        protein: 0.67,
        fat: 0.3,
        fiber: 2.0,
        vitamin_c: '97% DV',
      },
    },

    // --- TV (long text, booleans, URL arrays) ---

    mrrobot: {
      label: 'Mr. Robot',
      url: 'https://en.wikipedia.org/wiki/Mr._Robot',
      tags: ['tv', 'drama', 'thriller', 'tech'],
      description: 'A contemporary and colorful world of hackers and technology. Elliot, a young programmer working as a cyber-security engineer by day and a vigilante hacker by night, finds himself at a crossroads when a mysterious leader of an underground hacker group recruits him to destroy the corporation he is paid to protect.',
      meta: {
        seasons: 4,
        episodes: 45,
        ongoing: false,
        premiered: 2015,
        ended: 2019,
        network: 'USA Network',
        rating: 8.5,
        genres: ['Drama', 'Crime', 'Thriller', 'Science Fiction'],
        related_links: [
          'https://en.wikipedia.org/wiki/Mr._Robot',
          'https://www.imdb.com/title/tt4158110/',
          'https://www.rottentomatoes.com/tv/mr_robot',
        ],
      },
    },
  },
};
