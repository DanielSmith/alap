// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

/**
 * Raised when a config has a legacy shape requiring migration.
 *
 * <p>Currently thrown by {@link ValidateConfig#assertNoHandlersInConfig}
 * when a {@code config["protocols"][<name>]["generate" | "filter" |
 * "handler"]} slot holds a callable. Handlers must be registered
 * separately via the runtime registry; the config itself is pure data.
 */
public class ConfigMigrationError extends RuntimeException {
    public ConfigMigrationError(String message) {
        super(message);
    }
}
