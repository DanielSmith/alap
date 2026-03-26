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

import { useCallback } from 'react';
import { useAlapContext } from './AlapContext';
import type { AlapLink } from '../../core/types';

export interface UseAlapReturn {
  /** Expression → deduplicated array of item IDs */
  query: (expression: string, anchorId?: string) => string[];

  /** Expression → full link objects */
  resolve: (expression: string, anchorId?: string) => Array<{ id: string } & AlapLink>;

  /** IDs → full link objects */
  getLinks: (ids: string[]) => Array<{ id: string } & AlapLink>;
}

export function useAlap(): UseAlapReturn {
  const { engine } = useAlapContext();

  const query = useCallback(
    (expression: string, anchorId?: string) => engine.query(expression, anchorId),
    [engine],
  );

  const resolve = useCallback(
    (expression: string, anchorId?: string) => engine.resolve(expression, anchorId),
    [engine],
  );

  const getLinks = useCallback(
    (ids: string[]) => engine.getLinks(ids),
    [engine],
  );

  return { query, resolve, getLinks };
}
