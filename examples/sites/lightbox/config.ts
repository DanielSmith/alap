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
    favorites: { linkItems: 'goldengate, bluebottle, highline, andor, cyberpunk2077' },
    everything: { linkItems: '.bridge, .park, .coffee, .landmark, .scifi, .game' },
  },

  allLinks: {
    brooklyn: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['nyc', 'bridge', 'landmark'],
      description: 'Opened in 1883, connecting Manhattan and Brooklyn over the East River. One of the oldest roadway bridges in the United States.',
      thumbnail: '../shared/img/brooklyn.jpg',
      meta: { photoCredit: 'Hannes Richter', photoCreditUrl: 'https://unsplash.com/@harimedia' },
    },
    manhattan: {
      label: 'Manhattan Bridge',
      url: 'https://en.wikipedia.org/wiki/Manhattan_Bridge',
      tags: ['nyc', 'bridge'],
      description: 'A suspension bridge crossing the East River, connecting Lower Manhattan with Downtown Brooklyn.',
      thumbnail: '../shared/img/manhattan.jpg',
      meta: { photoCredit: 'YM', photoCreditUrl: 'https://unsplash.com/@ymoran' },
    },
    goldengate: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      tags: ['sf', 'bridge', 'landmark'],
      description: 'Spanning the Golden Gate strait, this 1937 suspension bridge is an internationally recognized symbol of San Francisco.',
      thumbnail: '../shared/img/goldengate.jpg',
      meta: { photoCredit: 'Maarten van den Heuvel', photoCreditUrl: 'https://unsplash.com/@mvdheuvel' },
    },
    highline: {
      label: 'The High Line',
      url: 'https://en.wikipedia.org/wiki/High_Line',
      tags: ['nyc', 'park', 'landmark'],
      description: 'An elevated linear park built on a historic freight rail line on the west side of Manhattan.',
      thumbnail: '../shared/img/highline.jpg',
      meta: { photoCredit: 'lo lindo', photoCreditUrl: 'https://unsplash.com/@lolindo' },
    },
    centralpark: {
      label: 'Central Park',
      url: 'https://en.wikipedia.org/wiki/Central_Park',
      tags: ['nyc', 'park'],
      description: 'An 843-acre urban park in the heart of Manhattan, the most visited urban park in the United States.',
      thumbnail: '../shared/img/centralpark.jpg',
      meta: { photoCredit: 'Harry Gillen', photoCreditUrl: 'https://unsplash.com/@gillenha' },
    },
    dolores: {
      label: 'Dolores Park',
      url: 'https://en.wikipedia.org/wiki/Dolores_Park',
      tags: ['sf', 'park'],
      description: 'A city park in the Mission District with views of downtown San Francisco and the East Bay.',
      thumbnail: '../shared/img/dolores.jpg',
      meta: { photoCredit: 'Leo Korman', photoCreditUrl: 'https://unsplash.com/@leokorman' },
    },
    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://bluebottlecoffee.com',
      tags: ['coffee', 'sf', 'nyc'],
      description: 'Third-wave coffee roaster founded in Oakland in 2002. Known for single-origin beans and minimalist cafes.',
      thumbnail: '../shared/img/bluebottle.jpg',
      meta: { photoCredit: 'Braden Collum', photoCreditUrl: 'https://unsplash.com/@bradencollum' },
    },
    ritual: {
      label: 'Ritual Coffee Roasters',
      url: 'https://ritualcoffee.com',
      tags: ['coffee', 'sf'],
      description: 'San Francisco roaster in the Mission District, a pioneer of the city\'s specialty coffee scene since 2005.',
    },
    stumptown: {
      label: 'Stumptown Coffee',
      url: 'https://stumptowncoffee.com',
      tags: ['coffee', 'portland'],
      description: 'Portland-based roaster known for direct trade sourcing and hair bender espresso blend.',
      thumbnail: '../shared/img/stumptown.jpg',
      meta: { photoCredit: 'Jordan Ringo', photoCreditUrl: 'https://unsplash.com/@jordyringo' },
    },
    coava: {
      label: 'Coava Coffee',
      url: 'https://coavacoffee.com',
      tags: ['coffee', 'portland'],
      description: 'Portland roaster focused on single-origin coffees and custom-built brewing equipment.',
    },

    // --- Chicago ---

    cloudgate: {
      label: 'Cloud Gate (The Bean)',
      url: 'https://en.wikipedia.org/wiki/Cloud_Gate',
      tags: ['chicago', 'landmark'],
      description: 'Anish Kapoor\'s polished steel sculpture in Millennium Park, reflecting Chicago\'s skyline in its liquid mercury surface.',
      thumbnail: '../shared/img/cloudgate.jpg',
      meta: { photoCredit: 'Vanessa Sezini', photoCreditUrl: 'https://unsplash.com/@vsezini' },
    },
    millenniumpark: {
      label: 'Millennium Park',
      url: 'https://en.wikipedia.org/wiki/Millennium_Park',
      tags: ['chicago', 'park', 'landmark'],
      description: 'A 24.5-acre public park in the Loop featuring Cloud Gate, Crown Fountain, and the Jay Pritzker Pavilion.',
      thumbnail: '../shared/img/millenniumpark.jpg',
      meta: { photoCredit: 'Kestner Brae De Vera', photoCreditUrl: 'https://unsplash.com/@kbdevera' },
    },

    // --- Detroit ---

    ambassadorbridge: {
      label: 'Ambassador Bridge',
      url: 'https://en.wikipedia.org/wiki/Ambassador_Bridge',
      tags: ['detroit', 'bridge'],
      description: 'A suspension bridge connecting Detroit with Windsor, Ontario — the busiest international border crossing in North America.',
      thumbnail: '../shared/img/ambassadorbridge.jpg',
      meta: { photoCredit: 'Brad Switzer', photoCreditUrl: 'https://unsplash.com/@mintchap' },
    },

    // --- Los Angeles ---

    griffith: {
      label: 'Griffith Observatory',
      url: 'https://en.wikipedia.org/wiki/Griffith_Observatory',
      tags: ['la', 'landmark'],
      description: 'An Art Deco observatory on Mount Hollywood offering panoramic views of the LA basin, the Pacific, and the Hollywood Sign.',
      thumbnail: '../shared/img/griffith.jpg',
      meta: { photoCredit: 'Venti Views', photoCreditUrl: 'https://unsplash.com/@ventiviews' },
    },
    venice: {
      label: 'Venice Beach',
      url: 'https://en.wikipedia.org/wiki/Venice,_Los_Angeles',
      tags: ['la', 'landmark'],
      description: 'A 2.5-mile oceanfront boardwalk known for street performers, Muscle Beach, and the eclectic spirit of west LA.',
      thumbnail: '../shared/img/venice.jpg',
      meta: { photoCredit: 'Florian Wehde', photoCreditUrl: 'https://unsplash.com/@florianwehde' },
    },

    // --- Sydney ---

    harbourbridge: {
      label: 'Sydney Harbour Bridge',
      url: 'https://en.wikipedia.org/wiki/Sydney_Harbour_Bridge',
      tags: ['sydney', 'bridge', 'landmark'],
      description: 'The world\'s largest steel arch bridge, connecting Sydney\'s CBD to the North Shore across the harbour since 1932.',
      thumbnail: '../shared/img/harbourbridge.jpg',
      meta: { photoCredit: 'Halley Tian', photoCreditUrl: 'https://unsplash.com/@stia004' },
    },
    operahouse: {
      label: 'Sydney Opera House',
      url: 'https://en.wikipedia.org/wiki/Sydney_Opera_House',
      tags: ['sydney', 'landmark'],
      description: 'Jorn Utzon\'s sail-roofed masterpiece on Bennelong Point, a UNESCO World Heritage Site and Australia\'s most famous building.',
      thumbnail: '../shared/img/operahouse.jpg',
      meta: { photoCredit: 'Jasper Wilde', photoCreditUrl: 'https://unsplash.com/@jasperwilde' },
    },

    // --- London ---

    towerbridge: {
      label: 'Tower Bridge',
      url: 'https://en.wikipedia.org/wiki/Tower_Bridge',
      tags: ['london', 'bridge', 'landmark'],
      description: 'A combined bascule and suspension bridge over the Thames, built in 1894 with Victorian Gothic towers.',
      thumbnail: '../shared/img/towerbridge.jpg',
      meta: { photoCredit: 'Flavio Vallone', photoCreditUrl: 'https://unsplash.com/@fotartistadigitale' },
    },
    hydePark: {
      label: 'Hyde Park',
      url: 'https://en.wikipedia.org/wiki/Hyde_Park,_London',
      tags: ['london', 'park'],
      description: 'One of London\'s Royal Parks covering 350 acres, home to the Serpentine lake and Speakers\' Corner.',
      thumbnail: '../shared/img/hydepark.jpg',
      meta: { photoCredit: 'Marco Chilese', photoCreditUrl: 'https://unsplash.com/@chmarco' },
    },

    // --- Paris ---

    pontneuf: {
      label: 'Pont Neuf',
      url: 'https://en.wikipedia.org/wiki/Pont_Neuf',
      tags: ['paris', 'bridge', 'landmark'],
      description: 'The oldest standing bridge across the Seine in Paris, completed in 1607 despite its name meaning "New Bridge."',
      thumbnail: '../shared/img/pontneuf.jpg',
      meta: { photoCredit: 'Rachel Calvo', photoCreditUrl: 'https://unsplash.com/@rachelcalvophoto' },
    },
    luxembourg: {
      label: 'Luxembourg Gardens',
      url: 'https://en.wikipedia.org/wiki/Jardin_du_Luxembourg',
      tags: ['paris', 'park'],
      description: 'A 23-hectare palace garden in the 6th arrondissement, inspired by the Boboli Gardens in Florence.',
      thumbnail: '../shared/img/luxembourg.jpg',
      meta: { photoCredit: 'Kamilla Isalieva', photoCreditUrl: 'https://unsplash.com/@kamillaisalieva' },
    },

    // --- Berlin ---

    oberbaum: {
      label: 'Oberbaum Bridge',
      url: 'https://en.wikipedia.org/wiki/Oberbaum_Bridge',
      tags: ['berlin', 'bridge', 'landmark'],
      description: 'A double-deck bridge over the Spree with Gothic Revival towers, once a Cold War border crossing between East and West Berlin.',
      thumbnail: '../shared/img/oberbaum.jpg',
      meta: { photoCredit: 'derek braithwaite', photoCreditUrl: 'https://unsplash.com/@snapdb' },
    },
    kaiserwilhelm: {
      label: 'Kaiser Wilhelm Memorial Church',
      url: 'https://en.wikipedia.org/wiki/Kaiser_Wilhelm_Memorial_Church',
      tags: ['berlin', 'landmark'],
      description: 'A war-damaged Romanesque Revival church on the Kurf\u00fcrstendamm, preserved as a memorial against war and destruction.',
      thumbnail: '../shared/img/kaiserwilhelm.jpg',
      meta: { photoCredit: 'Gregor Samimi', photoCreditUrl: 'https://unsplash.com/@gregorsamimi' },
    },

    // --- Seattle ---

    spaceneedle: {
      label: 'Space Needle',
      url: 'https://en.wikipedia.org/wiki/Space_Needle',
      tags: ['seattle', 'landmark'],
      description: 'Built for the 1962 World\'s Fair, this 605-foot observation tower defines the Seattle skyline.',
      thumbnail: '../shared/img/spaceneedle.jpg',
      meta: { photoCredit: 'Andrea Leopardi', photoCreditUrl: 'https://unsplash.com/@whatyouhide' },
    },
    pikeplace: {
      label: 'Pike Place Market',
      url: 'https://en.wikipedia.org/wiki/Pike_Place_Market',
      tags: ['seattle', 'landmark'],
      description: 'One of the oldest continuously operated public farmers\' markets in the US, opened in 1907 overlooking Elliott Bay.',
      thumbnail: '../shared/img/pikeplace.jpg',
      meta: { photoCredit: 'Doctor Tinieblas', photoCreditUrl: 'https://unsplash.com/@doctortinieblas' },
    },

    // --- Portland ---

    stjohns: {
      label: 'St. Johns Bridge',
      url: 'https://en.wikipedia.org/wiki/St._Johns_Bridge',
      tags: ['portland', 'bridge', 'landmark'],
      description: 'A Gothic Revival suspension bridge spanning the Willamette River, with 400-foot towers inspired by medieval cathedrals.',
      thumbnail: '../shared/img/stjohns.jpg',
      meta: { photoCredit: 'Kevin Butz', photoCreditUrl: 'https://unsplash.com/@kevin_butz' },
    },
    forestpark: {
      label: 'Forest Park',
      url: 'https://en.wikipedia.org/wiki/Forest_Park_(Portland,_Oregon)',
      tags: ['portland', 'park'],
      description: 'One of the largest urban forests in the US at over 5,200 acres, with 80+ miles of trails within Portland city limits.',
      thumbnail: '../shared/img/forestpark.jpg',
      meta: { photoCredit: 'J Lopes', photoCreditUrl: 'https://unsplash.com/@offeringofpie' },
    },

    // --- Tokyo ---

    rainbowbridge: {
      label: 'Rainbow Bridge',
      url: 'https://en.wikipedia.org/wiki/Rainbow_Bridge_(Tokyo)',
      tags: ['tokyo', 'bridge', 'landmark'],
      description: 'A suspension bridge spanning Tokyo Bay between Shibaura Pier and Odaiba, lit in white at night against the city skyline.',
      thumbnail: '../shared/img/rainbowbridge.jpg',
      meta: { photoCredit: 'Se. Tsuchiya', photoCreditUrl: 'https://unsplash.com/@s_tsuchiya' },
    },
    yoyogi: {
      label: 'Yoyogi Park',
      url: 'https://en.wikipedia.org/wiki/Yoyogi_Park',
      tags: ['tokyo', 'park'],
      description: 'A sprawling green space in Shibuya built on the former Olympic village site, famous for weekend cosplay gatherings and street performers.',
      thumbnail: '../shared/img/yoyogi.jpg',
      meta: { photoCredit: 'Andrea Serini', photoCreditUrl: 'https://unsplash.com/@andreilsero' },
    },

    // --- Seoul ---

    banpo: {
      label: 'Banpo Bridge',
      url: 'https://en.wikipedia.org/wiki/Banpo_Bridge',
      tags: ['seoul', 'bridge', 'landmark'],
      description: 'A double-deck bridge over the Han River featuring the Moonlight Rainbow Fountain, the world\'s longest bridge fountain.',
      thumbnail: '../shared/img/banpo.jpg',
      meta: { photoCredit: 'Minku Kang', photoCreditUrl: 'https://unsplash.com/@minkus' },
    },
    namsan: {
      label: 'Namsan Tower',
      url: 'https://en.wikipedia.org/wiki/N_Seoul_Tower',
      tags: ['seoul', 'landmark'],
      description: 'A communication and observation tower on Namsan Mountain offering 360-degree views of Seoul, famous for its love lock fence.',
      thumbnail: '../shared/img/namsan.jpg',
      meta: { photoCredit: 'Venancio Dionela', photoCreditUrl: 'https://unsplash.com/@vdionelajr' },
    },

    // --- Melbourne ---

    flindersst: {
      label: 'Flinders Street Station',
      url: 'https://en.wikipedia.org/wiki/Flinders_Street_station',
      tags: ['melbourne', 'landmark'],
      description: 'Melbourne\'s iconic Edwardian Baroque railway station at the corner of Flinders and Swanston streets, the city\'s most recognized landmark.',
      thumbnail: '../shared/img/flindersst.jpg',
      meta: { photoCredit: 'Ann-Maree Hannon', photoCreditUrl: 'https://unsplash.com/@reehannon' },
    },
    royalbotanic: {
      label: 'Royal Botanic Gardens',
      url: 'https://en.wikipedia.org/wiki/Royal_Botanic_Gardens,_Melbourne',
      tags: ['melbourne', 'park', 'landmark'],
      description: 'A 94-acre heritage-listed garden on the south bank of the Yarra, home to over 8,500 plant species since 1846.',
      thumbnail: '../shared/img/royalbotanic.jpg',
      meta: { photoCredit: 'John Torcasio', photoCreditUrl: 'https://unsplash.com/@johntorcasio' },
    },

    // --- Shanghai ---

    nanpu: {
      label: 'Nanpu Bridge',
      url: 'https://en.wikipedia.org/wiki/Nanpu_Bridge',
      tags: ['shanghai', 'bridge'],
      description: 'The first bridge to cross the Huangpu River, known for its spiraling on-ramp that coils like a dragon from the Puxi side.',
      thumbnail: '../shared/img/nanpu.jpg',
      meta: { photoCredit: 'Alex Sun', photoCreditUrl: 'https://unsplash.com/@sfang2023' },
    },
    thebund: {
      label: 'The Bund',
      url: 'https://en.wikipedia.org/wiki/The_Bund',
      tags: ['shanghai', 'landmark'],
      description: 'A waterfront promenade along the Huangpu lined with 52 colonial-era buildings facing the futuristic Pudong skyline across the river.',
      thumbnail: '../shared/img/thebund.jpg',
      meta: { photoCredit: 'Edward He', photoCreditUrl: 'https://unsplash.com/@bingham008' },
    },

    // --- Mumbai ---

    cst: {
      label: 'Chhatrapati Shivaji Terminus',
      url: 'https://en.wikipedia.org/wiki/Chhatrapati_Shivaji_Terminus',
      tags: ['mumbai', 'landmark'],
      description: 'A UNESCO World Heritage Site and one of the busiest railway stations in India, built in Victorian Gothic Revival style in 1888.',
      thumbnail: '../shared/img/cst.jpg',
      meta: { photoCredit: 'Darshan Chudasama', photoCreditUrl: 'https://unsplash.com/@darsh2311' },
    },
    gatewayofindia: {
      label: 'Gateway of India',
      url: 'https://en.wikipedia.org/wiki/Gateway_of_India',
      tags: ['mumbai', 'landmark'],
      description: 'A 26-metre basalt arch on the Mumbai waterfront built in 1924 to commemorate the visit of King George V and Queen Mary.',
      thumbnail: '../shared/img/gatewayofindia.jpg',
      meta: { photoCredit: 'Sushant Hembrom', photoCreditUrl: 'https://unsplash.com/@susmac007' },
    },

    // --- Sci-fi TV & Film ---

    andor: {
      label: 'Andor',
      url: 'https://en.wikipedia.org/wiki/Andor_(TV_series)',
      tags: ['scifi', 'tv'],
      description: 'A spy thriller set in the Star Wars universe following Cassian Andor during the early days of the rebellion against the Empire.',
    },
    babylon5: {
      label: 'Babylon 5',
      url: 'https://en.wikipedia.org/wiki/Babylon_5',
      tags: ['scifi', 'tv'],
      description: 'A diplomatic space station becomes the focal point of galactic politics, ancient prophecies, and interstellar war.',
    },
    bsg: {
      label: 'Battlestar Galactica',
      url: 'https://en.wikipedia.org/wiki/Battlestar_Galactica_(2004_TV_series)',
      tags: ['scifi', 'tv'],
      description: 'The remnants of humanity flee across space pursued by the Cylons, machines they created that turned against them.',
    },
    mrrobot: {
      label: 'Mr. Robot',
      url: 'https://en.wikipedia.org/wiki/Mr._Robot',
      tags: ['scifi', 'tv'],
      description: 'A cybersecurity engineer and hacker is recruited by an anarchist to destroy the corporation he works for.',
    },
    cowboybebop: {
      label: 'Cowboy Bebop',
      url: 'https://en.wikipedia.org/wiki/Cowboy_Bebop',
      tags: ['scifi', 'tv', 'anime'],
      description: 'A ragtag crew of bounty hunters chase criminals across the solar system in 2071, set to a jazz soundtrack.',
    },

    // --- Games ---

    cyberpunk2077: {
      label: 'Cyberpunk 2077',
      url: 'https://en.wikipedia.org/wiki/Cyberpunk_2077',
      tags: ['game', 'scifi'],
      description: 'An open-world RPG set in Night City, a megalopolis obsessed with power, glamour, and body modification.',
    },
    rdr2: {
      label: 'Red Dead Redemption 2',
      url: 'https://en.wikipedia.org/wiki/Red_Dead_Redemption_2',
      tags: ['game'],
      description: 'An epic tale of life in the unforgiving American heartland as the era of outlaws comes to an end.',
    },
    fallout4: {
      label: 'Fallout 4',
      url: 'https://en.wikipedia.org/wiki/Fallout_4',
      tags: ['game', 'scifi'],
      description: 'A post-apocalyptic RPG set in the ruins of Boston, where you emerge from a vault 200 years after nuclear war.',
    },
  },
};
