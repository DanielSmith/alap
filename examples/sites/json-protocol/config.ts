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

import type { AlapConfig } from 'alap/core';
import { jsonHandler } from '../../../src/protocols/json';

export const demoConfig: AlapConfig = {
  settings: {
    listType: 'ul',
    menuTimeout: 5000,
  },

  protocols: {
    json: {
      generate: jsonHandler,
      cache: 10,
      vars: {
        miles_davis: 'miles davis',
        van_gogh: 'van gogh',
        nina_simone: 'nina simone',
        jazz_history: 'jazz history',
        golden_gate: 'golden gate',
        civil_war: 'civil war',
      },
      sources: {

        // ── Menu sources ────────────────────────────────────────

        /**
         * REST Countries — bare array response, nested fields, flags as thumbnails.
         * https://restcountries.com/
         */
        countries_europe: {
          url: 'https://restcountries.com/v3.1/region/europe?fields=name,flags,capital,region,subregion,population',
          // Bare array — no root needed
          fieldMap: {
            label: 'name.common',
            url: 'flags.svg',
            thumbnail: 'flags.png',
            tags: 'subregion',
            meta: {
              capital: 'capital[0]',
              population: 'population',
              official_name: 'name.official',
            },
          },
        },

        countries_americas: {
          url: 'https://restcountries.com/v3.1/region/americas?fields=name,flags,capital,region,subregion,population',
          fieldMap: {
            label: 'name.common',
            url: 'flags.svg',
            thumbnail: 'flags.png',
            tags: 'subregion',
            meta: {
              capital: 'capital[0]',
              population: 'population',
            },
          },
        },

        /**
         * iTunes Search — music albums by artist.
         * Object with `results` array.
         * https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
         */
        itunes_albums: {
          url: 'https://itunes.apple.com/search?term=${1}&entity=album&limit=10',
          root: 'results',
          fieldMap: {
            label: 'collectionName',
            url: 'collectionViewUrl',
            thumbnail: 'artworkUrl100',
            tags: 'primaryGenreName',
            meta: {
              artist: 'artistName',
              tracks: 'trackCount',
              price: 'collectionPrice',
              release: 'releaseDate',
            },
          },
        },

        // ── Lightbox sources ────────────────────────────────────

        /**
         * Art Institute of Chicago — IIIF images with envelope template vars.
         * Object with `data` array + `config` envelope containing iiif_url.
         * https://api.artic.edu/docs/
         */
        artic: {
          url: 'https://api.artic.edu/api/v1/artworks/search?q=${1}&limit=12&fields=id,title,artist_display,date_display,image_id,thumbnail,classification,department_title',
          root: 'data',
          envelope: {
            iiif_url: 'config.iiif_url',
            api_info: 'info.license_text',
          },
          fieldMap: {
            label: 'title',
            url: 'https://www.artic.edu/artworks/${id}',
            image: '${_envelope.iiif_url}/${image_id}/full/843,/0/default.jpg',
            thumbnail: '${_envelope.iiif_url}/${image_id}/full/200,/0/default.jpg',
            description: 'thumbnail.alt_text',
            meta: {
              artist: 'artist_display',
              date: 'date_display',
              classification: 'classification',
              department: 'department_title',
            },
          },
        },

        /**
         * Wikimedia Commons — public domain images from Wikipedia's media library.
         * Uses formatversion=2 for array output. Artist and description contain
         * HTML (stripped automatically). Thumbnails at requested width.
         * https://www.mediawiki.org/wiki/API:Main_page
         */
        wikimedia: {
          url: 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${1}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json&formatversion=2',
          root: 'query.pages',
          fieldMap: {
            label: 'title',
            url: 'imageinfo[0].descriptionurl',
            image: 'imageinfo[0].thumburl',
            thumbnail: 'imageinfo[0].thumburl',
            description: 'imageinfo[0].extmetadata.ImageDescription.value',
            meta: {
              artist: 'imageinfo[0].extmetadata.Artist.value',
              license: 'imageinfo[0].extmetadata.LicenseShortName.value',
            },
          },
        },

        // ── Lens sources ────────────────────────────────────────

        /**
         * Open Library Search — books with cover images and rich metadata.
         * Object with `docs` array + `numFound` envelope.
         * https://openlibrary.org/developers/api
         * Rate limit: 1 req/sec (use high cache TTL).
         */
        openlibrary: {
          url: 'https://openlibrary.org/search.json?q=${1}&limit=10',
          root: 'docs',
          envelope: {
            total_results: 'numFound',
          },
          fieldMap: {
            label: 'title',
            url: 'https://openlibrary.org${key}',
            thumbnail: 'https://covers.openlibrary.org/b/id/${cover_i}-M.jpg',
            meta: {
              author: 'author_name[0]',
              year: 'first_publish_year',
              editions: 'edition_count',
              languages: 'language',
            },
          },
        },

        /**
         * Library of Congress Search — general collection search with rich metadata.
         * Object with `results` array. Good for lens: dates, subjects, formats.
         * https://www.loc.gov/apis/
         */
        loc_search: {
          url: 'https://www.loc.gov/search/?q=${1}&fo=json&c=10',
          root: 'results',
          fieldMap: {
            label: 'title',
            url: 'url',
            thumbnail: 'image_url[0]',
            tags: 'subject',
            description: 'description[0]',
            meta: {
              date: 'date',
              format: 'original_format[0]',
              contributor: 'contributor[0]',
              location: 'location[0]',
            },
          },
        },

        /**
         * MusicBrainz — album (release-group) search by artist.
         * Object with `release-groups` array + `count` envelope.
         * Requires User-Agent header per MB API terms.
         * https://musicbrainz.org/doc/MusicBrainz_API
         */
        musicbrainz: {
          url: 'https://musicbrainz.org/ws/2/release-group?query=artist:${1}%20AND%20type:album&fmt=json&limit=10',
          root: 'release-groups',
          headers: {
            'User-Agent': 'AlapDemo/1.0 (https://alap.info)',
          },
          envelope: {
            total_results: 'count',
          },
          fieldMap: {
            label: 'title',
            url: 'https://musicbrainz.org/release-group/${id}',
            tags: 'tags[].name',
            meta: {
              artist: 'artist-credit[0].artist.name',
              released: 'first-release-date',
              type: 'primary-type',
              secondary_types: 'secondary-types',
            },
          },
        },
      },
    },
  },

  allLinks: {
    // Static links for composition demos — combine with :json: results
    wikipedia_bridges: {
      label: 'Bridges — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Bridge',
      tags: ['reference', 'architecture'],
    },
    wikipedia_monet: {
      label: 'Claude Monet — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Claude_Monet',
      tags: ['reference', 'art'],
    },
  },
};
