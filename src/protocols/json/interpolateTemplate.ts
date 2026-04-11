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

import { getPath } from '../shared';
import { getFieldValue } from './getFieldValue';

/**
 * Check whether a string contains ${...} template placeholders.
 */
export const isTemplate = (value: string): boolean => value.includes('${');

/**
 * Replace ${field} placeholders in a template string with values from the item.
 * Supports ${_envelope.fieldName} for envelope data.
 * Returns the interpolated string, or undefined if any referenced field is missing.
 */
export const interpolateTemplate = (
  template: string,
  item: Record<string, unknown>,
  envelope?: Record<string, unknown>,
): string | undefined => {
  let hasUnresolved = false;

  const result = template.replace(/\$\{([^}]+)\}/g, (_match, fieldPath: string) => {
    let value: unknown;
    if (fieldPath.startsWith('_envelope.') && envelope) {
      value = getPath(envelope, fieldPath.slice('_envelope.'.length));
    } else {
      value = getFieldValue(item, fieldPath);
    }
    if (value === undefined || value === null) {
      hasUnresolved = true;
      return '';
    }
    return String(value);
  });

  return hasUnresolved ? undefined : result;
};
