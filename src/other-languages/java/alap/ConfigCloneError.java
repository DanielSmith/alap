// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

/**
 * Raised by {@link DeepClone#call(Object)} when a config contains a
 * non-data value or exceeds a resource bound.
 */
public class ConfigCloneError extends RuntimeException {
    public ConfigCloneError(String message) {
        super(message);
    }
}
