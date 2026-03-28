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

import { useAlapContext } from './context';
import type { AlapLink } from '../../core/types';

export interface UseAlapReturn {
  query: (expression: string, anchorId?: string) => string[];
  resolve: (expression: string, anchorId?: string) => Array<{ id: string } & AlapLink>;
  getLinks: (ids: string[]) => Array<{ id: string } & AlapLink>;
}

export function useAlap(): UseAlapReturn {
  const ctx = useAlapContext();

  return {
    query: (expression, anchorId?) => {
      if (!ctx.engine) throw new Error('AlapEngine not initialized');
      return ctx.engine.query(expression, anchorId);
    },
    resolve: (expression, anchorId?) => {
      if (!ctx.engine) throw new Error('AlapEngine not initialized');
      return ctx.engine.resolve(expression, anchorId);
    },
    getLinks: (ids) => {
      if (!ctx.engine) throw new Error('AlapEngine not initialized');
      return ctx.engine.getLinks(ids);
    },
  };
}
