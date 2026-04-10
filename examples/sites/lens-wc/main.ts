/**
 * Copyright 2026 Daniel Smith
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerConfig } from '../../../src/ui/shared/configRegistry';
import { defineAlapLens } from '../../../src/ui-lens/AlapLensElement';
import { demoConfig } from '../lens/config';

// Register the shared config and define the <alap-lens> element
registerConfig(demoConfig);
defineAlapLens();
