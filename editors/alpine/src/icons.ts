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

import menuSvg from '../assets/svg/menu.svg?raw';
import searchSvg from '../assets/svg/search.svg?raw';
import helpSvg from '../assets/svg/help.svg?raw';
import cloneSvg from '../assets/svg/clone.svg?raw';
import xSvg from '../assets/svg/x.svg?raw';
import gearSvg from '../assets/svg/gear.svg?raw';
import saveSvg from '../assets/svg/save.svg?raw';
import importSvg from '../assets/svg/import.svg?raw';
import exportSvg from '../assets/svg/export.svg?raw';
import plusSvg from '../assets/svg/plus.svg?raw';
import trashSvg from '../assets/svg/trash.svg?raw';
import folderOpenSvg from '../assets/svg/folder-open.svg?raw';

/**
 * SVG icon strings imported as raw markup for inline rendering.
 * Use with x-html in Alpine templates:
 *   <span x-html="$store.icons.menu" class="icon"></span>
 */
export const icons = {
  menu: menuSvg,
  search: searchSvg,
  help: helpSvg,
  clone: cloneSvg,
  x: xSvg,
  gear: gearSvg,
  save: saveSvg,
  import: importSvg,
  export: exportSvg,
  plus: plusSvg,
  trash: trashSvg,
  folderOpen: folderOpenSvg,
} as const;
