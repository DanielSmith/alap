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

/** Maximum parentheses nesting depth before the parser bails out */
export const MAX_DEPTH = 32;

/** Maximum token count before the parser rejects an expression */
export const MAX_TOKENS = 1024;

/** Maximum rounds of macro expansion before assuming a cycle */
export const MAX_MACRO_EXPANSIONS = 10;

/** Default menu auto-dismiss timeout in milliseconds */
export const DEFAULT_MENU_TIMEOUT = 5000;

/** Default maximum visible menu items before scrolling. 0 = no limit. */
export const DEFAULT_MAX_VISIBLE_ITEMS = 10;

/** Maximum regex atoms allowed in a single expression */
export const MAX_REGEX_QUERIES = 5;

/** Maximum items a regex search can return before truncating */
export const MAX_SEARCH_RESULTS = 100;

/** Maximum execution time (ms) for the entire regex resolution phase */
export const REGEX_TIMEOUT_MS = 20;

/** Maximum refiners allowed in a single expression */
export const MAX_REFINERS = 10;

/** Estimated height per menu item in rem, used for maxVisibleItems scroll calculation */
export const REM_PER_MENU_ITEM = 2.25;

/** Default cache TTL in minutes for generate protocol results */
export const DEFAULT_GENERATE_CACHE_TTL = 5;

/** Maximum links a generate handler can return per call */
export const MAX_GENERATED_LINKS = 200;

/** Timeout in milliseconds for :web: protocol fetch requests */
export const WEB_FETCH_TIMEOUT_MS = 10_000;

/** Maximum response body size in bytes for :web: protocol fetch requests (1 MB) */
export const MAX_WEB_RESPONSE_BYTES = 1_048_576;

/** Maximum entries in the generate protocol cache before oldest is evicted */
export const MAX_CACHE_ENTRIES = 50;

/** Default menu placement relative to the trigger */
export const DEFAULT_PLACEMENT = 'SE' as const;

/** Default pixel gap between trigger edge and menu edge */
export const DEFAULT_PLACEMENT_GAP = 4;

/** Default minimum pixel distance the menu keeps from viewport edges */
export const DEFAULT_VIEWPORT_PADDING = 8;

/** Whether focus() calls on menu items should suppress browser scroll. */
export const DEFAULT_PREVENT_FOCUS_SCROLL = true;

/** Default behavior when trigger scrolls off-screen while menu is open */
export const DEFAULT_TRIGGER_OFFSCREEN = 'close' as const;

/** Default z-index for menu containers */
export const DEFAULT_MENU_Z_INDEX = 10;

/** CSS class for the menu container */
export const MENU_CONTAINER_CLASS = 'alapelem';

/** CSS class for each menu list item */
export const MENU_ITEM_CLASS = 'alapListElem';

/** Default link target for menu item anchors */
export const DEFAULT_LINK_TARGET = 'fromAlap';

/** Permissions Policy for embed iframes — required by YouTube, Spotify, etc. */
export const EMBED_ALLOW_POLICY = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

/** Referrer policy for embed iframes — matches YouTube's oembed recommendation */
export const EMBED_REFERRER_POLICY = 'strict-origin-when-cross-origin';

/** localStorage key for per-domain embed consent */
export const EMBED_CONSENT_KEY = 'alap_embed_consent';

/** Default maximum width in px for embed iframes */
export const EMBED_DEFAULT_MAX_WIDTH = 560;

/** Default height in px for video embeds (YouTube, Vimeo) */
export const EMBED_VIDEO_HEIGHT = 315;

/** Default height in px for audio embeds (Spotify tracks/albums) */
export const EMBED_AUDIO_HEIGHT = 152;

/** Default height in px for interactive embeds (CodePen, CodeSandbox) */
export const EMBED_INTERACTIVE_HEIGHT = 400;
