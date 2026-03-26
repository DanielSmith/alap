/**
 * Alap config + web component registration for IIFE mode.
 * In production, use the Astro integration with `npm install alap` instead.
 */
(() => {
  const config = {
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
      },
      tartine: {
        label: 'Tartine Bakery',
        url: 'https://tartinebakery.com',
        tags: ['coffee', 'sf', 'bakery'],
      },
      stumptownchelseanyc: {
        label: 'Stumptown Chelsea',
        url: 'https://stumptowncoffee.com',
        tags: ['coffee', 'nyc'],
      },
      doughnutplantnyc: {
        label: 'Doughnut Plant NYC',
        url: 'https://doughnutplant.com',
        tags: ['nyc', 'bakery'],
      },
      brooklynbridge: {
        label: 'Brooklyn Bridge',
        url: 'https://en.wikipedia.org/wiki/Brooklyn_Bridge',
        tags: ['nyc', 'bridge', 'landmark'],
      },
      goldengate: {
        label: 'Golden Gate Bridge',
        url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
        tags: ['sf', 'bridge', 'landmark'],
      },
      highline: {
        label: 'The High Line',
        url: 'https://thehighline.org',
        tags: ['nyc', 'park'],
      },
      dolorespark: {
        label: 'Dolores Park',
        url: 'https://en.wikipedia.org/wiki/Dolores_Park',
        tags: ['sf', 'park'],
      },
    },
  };

  Alap.defineAlapLink();
  Alap.registerConfig(config);
})();
