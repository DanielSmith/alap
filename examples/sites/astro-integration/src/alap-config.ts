/**
 * Shared Alap config — imported automatically by the integration.
 * Pages never need to touch this file directly.
 */
export default {
  settings: { listType: 'ul', menuTimeout: 5000 },

  macros: {
    favorites: { linkItems: 'bluebottle, tartine, goldengate' },
    bridges: { linkItems: '.bridge' },
  },

  allLinks: {
    bluebottle: {
      label: 'Blue Bottle Coffee',
      url: 'https://bluebottlecoffee.com',
      tags: ['coffee', 'sf'],
      description: 'Specialty coffee roaster founded in Oakland.',
    },
    tartine: {
      label: 'Tartine Bakery',
      url: 'https://tartinebakery.com',
      tags: ['coffee', 'sf', 'bakery'],
      description: 'Iconic Mission District bakery. The morning bun is legendary.',
    },
    stumptownchelseanyc: {
      label: 'Stumptown Chelsea',
      url: 'https://stumptowncoffee.com',
      tags: ['coffee', 'nyc'],
      description: 'Portland-born roaster with a cozy Chelsea outpost.',
    },
    doughnutplantnyc: {
      label: 'Doughnut Plant NYC',
      url: 'https://doughnutplant.com',
      tags: ['nyc', 'bakery'],
      description: 'Square doughnuts and creative flavors since 1994.',
    },
    brooklynbridge: {
      label: 'Brooklyn Bridge',
      url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
      tags: ['nyc', 'bridge', 'landmark'],
      description: 'First steel-wire suspension bridge, opened 1883.',
    },
    goldengate: {
      label: 'Golden Gate Bridge',
      url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
      tags: ['sf', 'bridge', 'landmark'],
      description: 'Art Deco suspension bridge spanning the Golden Gate strait.',
    },
    highline: {
      label: 'The High Line',
      url: 'https://thehighline.org',
      tags: ['nyc', 'park'],
      description: 'Elevated linear park built on a historic freight rail line.',
    },
    dolorespark: {
      label: 'Dolores Park',
      url: 'https://en.wikipedia.org/wiki/Dolores_Park',
      tags: ['sf', 'park'],
      description: 'Sunny 16-acre park with downtown views and palm trees.',
    },
  },
};
