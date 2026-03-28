/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import alapPlugin from 'eleventy-alap';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const config = require('./alap-config.json');

export default function(eleventyConfig) {
  eleventyConfig.addPlugin(alapPlugin, { config });

  // Static assets → _site/
  eleventyConfig.addPassthroughCopy({ 'src/styles.css': 'styles.css' });
  eleventyConfig.addPassthroughCopy({ 'src/config.js': 'config.js' });
  eleventyConfig.addPassthroughCopy({
    'node_modules/alap/dist/alap.iife.js': 'alap.iife.js',
  });

  return {
    dir: {
      input: 'src',
      output: '_site',
    },
  };
}
