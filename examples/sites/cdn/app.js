// Web Component setup
Alap.defineAlapLink();
Alap.registerConfig(config);

// DOM Adapter
const ui = new Alap.AlapUI(config, '.alap');

// Programmatic engine demo
const engine = new Alap.AlapEngine(config);
const ids = engine.query('.nyc');
const links = engine.resolve('.nyc');

const lines = [
  `engine.query(".nyc") → ${JSON.stringify(ids)}`,
  '',
  'engine.resolve(".nyc") →',
  ...links.map((link) => `  ${link.id}: ${link.label} (${link.url})`),
];

document.getElementById('engine-output').textContent = lines.join('\n');
