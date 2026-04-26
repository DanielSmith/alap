<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

namespace Alap;

/**
 * Raised when a config has a legacy shape requiring migration.
 *
 * Currently thrown by `Alap\ValidateConfig::assertNoHandlersInConfig`
 * when a `$config['protocols'][<name>]['generate' | 'filter' |
 * 'handler']` slot holds a callable. Handlers must be registered
 * separately via the runtime registry; the config itself is pure data.
 */
class ConfigMigrationError extends \Exception
{
}
