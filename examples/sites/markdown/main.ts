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

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import remarkAlap from '../../../plugins/remark-alap/src/index';
import { registerConfig, defineAlapLink } from 'alap';
import { demoConfig } from './config';
import markdownSource from './content.md?raw';

// 1. Register Alap web component and config
defineAlapLink();
registerConfig(demoConfig);

// 2. Process markdown through remark-alap
async function render() {
  const result = await unified()
    .use(remarkParse)
    .use(remarkAlap)
    .use(remarkHtml, { sanitize: false })
    .process(markdownSource);

  // 3. Render the processed HTML
  document.getElementById('content')!.innerHTML = String(result);

  // 4. Show the raw markdown source
  document.getElementById('source')!.textContent = markdownSource;
}

render();
