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

/**
 * Configuration for a single source in the :json: protocol.
 */
export interface JsonSourceConfig {
  /** API endpoint URL. May contain ${...} template vars filled by expression segments. */
  url: string;

  /** Dot-path to the data array in the response (e.g. "data.items"). Omit if response is a bare array. */
  root?: string;

  /** Extract response-level metadata, attached as meta.* on every generated item. */
  envelope?: Record<string, string>;

  /** Explicit field mapping from source data paths to AlapLink fields. */
  fieldMap: {
    label?: string;
    url?: string;
    tags?: string;
    description?: string;
    thumbnail?: string;
    image?: string;
    /** Arbitrary source fields mapped to meta.* with type preservation. */
    meta?: Record<string, string>;
  };

  /** URL prefix for relative URLs in mapped fields. */
  linkBase?: string;

  /** HTTP headers to include in fetch requests. */
  headers?: Record<string, string>;

  /** Allowed URL schemes beyond the dangerous-scheme blocklist. Default: ['http', 'https']. */
  allowedSchemes?: string[];

  /**
   * Send browser credentials (cookies, HTTP auth) with the fetch request.
   * Default is false — credentials are omitted for security.
   */
  credentials?: boolean;
}
