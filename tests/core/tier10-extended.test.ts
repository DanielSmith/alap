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

import { describe, it, expect, beforeEach } from 'vitest';
import { AlapEngine } from '../../src/core/AlapEngine';
import { extendedTestConfig } from '../fixtures/extended-links';

describe('Tier 10: Extended Links & Macros', () => {
  let engine: AlapEngine;

  beforeEach(() => {
    engine = new AlapEngine(extendedTestConfig);
  });

  it('should resolve a large set of world landmarks via macro', () => {
    const links = engine.resolve('.landmark');
    expect(links.length).toBeGreaterThan(10);
    expect(links.some(l => l.label === 'Eiffel Tower')).toBe(true);
    expect(links.some(l => l.label === 'Sydney Opera House')).toBe(true);
  });

  it('should resolve all city parks via macro', () => {
    const links = engine.resolve('@cityparks');
    expect(links.length).toBeGreaterThan(10);
    expect(links.some(l => l.label === 'Central Park')).toBe(true);
    expect(links.some(l => l.label === 'Tiergarten')).toBe(true);
  });

  it('should resolve sci-fi series correctly', () => {
    const links = engine.resolve('.series + .scifi');
    expect(links.length).toBeGreaterThanOrEqual(15);
    expect(links.some(l => l.label === 'Foundation')).toBe(true);
    expect(links.some(l => l.label.includes('Star Trek'))).toBe(true);
    expect(links.some(l => l.label.includes('Mandalorian'))).toBe(true);
  });

  it('should filter by specific franchise macros', () => {
    const trek = engine.resolve('@startrek');
    const sw = engine.resolve('@starwars');
    
    expect(trek.length).toBe(8);
    expect(sw.length).toBe(6);
    expect(trek.every(l => l.tags.includes('trek'))).toBe(true);
    expect(sw.every(l => l.tags.includes('sw'))).toBe(true);
  });

  it('should handle complex intersections of genres and cities', () => {
    // Sci-fi movies in Los Angeles (Blade Runner)
    const links = engine.resolve('.scifi + .losangeles');
    expect(links.length).toBe(1);
    expect(links[0].label).toBe('Blade Runner');
  });

  it('should resolve food categories across cities', () => {
    const links = engine.resolve('@foodies');
    expect(links.length).toBe(5);
    expect(links.some(l => l.tags.includes('pizza'))).toBe(true);
    expect(links.some(l => l.tags.includes('bagels'))).toBe(true);
    expect(links.some(l => l.label === 'Pasta Adagio')).toBe(true);
  });
});
