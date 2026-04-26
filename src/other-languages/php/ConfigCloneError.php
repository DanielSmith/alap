<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

namespace Alap;

/**
 * Raised by `Alap\DeepClone::call` when a config contains a non-data
 * value or exceeds a resource bound.
 */
class ConfigCloneError extends \TypeError
{
}
