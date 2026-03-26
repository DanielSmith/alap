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

import type { ProtocolHandler } from '../core/types';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const WEEK = 7 * DAY;

/**
 * Parse a relative duration string into milliseconds.
 * Supports: "30d" (days), "24h" (hours), "2w" (weeks).
 * Returns 0 if the format is unrecognized.
 */
const parseDuration = (s: string): number => {
  const match = s.match(/^(\d+)([dhw])$/i);
  if (!match) return 0;
  const n = parseInt(match[1], 10);
  switch (match[2].toLowerCase()) {
    case 'h': return n * HOUR;
    case 'd': return n * DAY;
    case 'w': return n * WEEK;
    default: return 0;
  }
};

/**
 * Extract a timestamp (Unix ms) from a link.
 * Checks meta.timestamp first, then createdAt.
 */
const getTimestamp = (link: { createdAt?: string | number; meta?: Record<string, unknown> }): number => {
  const metaTs = link.meta?.timestamp;
  if (typeof metaTs === 'number') return metaTs;
  if (typeof metaTs === 'string') {
    const d = new Date(metaTs);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  if (link.createdAt === undefined || link.createdAt === null) return 0;
  if (typeof link.createdAt === 'number') return link.createdAt;
  const d = new Date(link.createdAt);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

/**
 * Built-in `:time:` protocol handler.
 *
 * Filters links by time. Checks `meta.timestamp` first, then `createdAt`.
 *
 * This is a **gathering** operation — it decides which links qualify based on
 * their timestamp. To *sort* results by time, use the `*sort:createdAt*` refiner
 * instead. Protocols gather; refiners shape.
 *
 * Syntax:
 *   :time:7d:                        → within the last 7 days
 *   :time:24h:                       → within the last 24 hours
 *   :time:2w:                        → within the last 2 weeks
 *   :time:today:                     → since midnight (local time)
 *   :time:7d:30d:                    → between 7 and 30 days ago (range)
 *   :time:2025-01-01:               → on or after this date
 *   :time:2025-01-01:2025-12-31:    → within date range (inclusive)
 *
 * Two args always means a range (start, end). The handler interprets the
 * segments — the parser just passes opaque strings between colons.
 *
 * Design notes:
 * - Timestamps are compared in UTC milliseconds. No timezone conversion.
 * - "today" uses local midnight — the one case where local time matters.
 * - Hyphens in ISO dates (2025-01-01) are safe — the tokenizer collects
 *   everything between colons without character filtering.
 * - This handler deliberately avoids time-of-day, recurring schedules,
 *   and timezone-aware comparisons. Those are complex domains better
 *   served by custom handlers (`:hours:`, `:schedule:`, etc.).
 *   :time:2025-01-01:2025-12-31: → created within this date range
 */
export const timeHandler: ProtocolHandler = (segments, link) => {
  const ts = getTimestamp(link);
  if (ts === 0) return false;

  const now = Date.now();

  if (segments.length === 1) {
    const seg = segments[0];

    // "today" — since midnight local time
    if (seg === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return ts >= todayStart.getTime();
    }

    // Relative duration: "7d", "24h", "2w"
    const duration = parseDuration(seg);
    if (duration > 0) {
      return (now - ts) <= duration;
    }

    // Absolute date: "2025-01-01"
    const date = new Date(seg);
    if (!isNaN(date.getTime())) {
      return ts >= date.getTime();
    }

    return false;
  }

  if (segments.length === 2) {
    // Two relative durations: "7d", "30d" → between 7 and 30 days ago
    const d1 = parseDuration(segments[0]);
    const d2 = parseDuration(segments[1]);
    if (d1 > 0 && d2 > 0) {
      const start = now - d2;
      const end = now - d1;
      return ts >= start && ts <= end;
    }

    // Two absolute dates: "2025-01-01", "2025-12-31"
    const date1 = new Date(segments[0]);
    const date2 = new Date(segments[1]);
    if (!isNaN(date1.getTime()) && !isNaN(date2.getTime())) {
      return ts >= date1.getTime() && ts <= date2.getTime();
    }

    return false;
  }

  return false;
};
