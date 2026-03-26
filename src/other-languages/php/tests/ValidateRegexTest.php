<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

/**
 * Tests for ExpressionParser::validateRegex() — mirrors the TS test tier.
 */

namespace Alap\Tests;

use PHPUnit\Framework\TestCase;
use Alap\ExpressionParser;

class ValidateRegexTest extends TestCase
{
    // --- Safe patterns ---

    public function testValidSimplePattern(): void
    {
        $result = ExpressionParser::validateRegex('bridge');
        $this->assertTrue($result['safe']);
    }

    public function testValidAnchoredPattern(): void
    {
        $result = ExpressionParser::validateRegex('^foo$');
        $this->assertTrue($result['safe']);
    }

    // --- Invalid syntax ---

    public function testInvalidSyntax(): void
    {
        $result = ExpressionParser::validateRegex('[unclosed');
        $this->assertFalse($result['safe']);
        $this->assertSame('Invalid regex syntax', $result['reason']);
    }

    // --- Dangerous patterns (nested quantifiers) ---

    public function testNestedQuantifierPlus(): void
    {
        $result = ExpressionParser::validateRegex('(a+)+');
        $this->assertFalse($result['safe']);
    }

    public function testNestedQuantifierStar(): void
    {
        $result = ExpressionParser::validateRegex('(a*)*b');
        $this->assertFalse($result['safe']);
    }

    public function testNestedQuantifierWord(): void
    {
        $result = ExpressionParser::validateRegex('(\w+\w+)+');
        $this->assertFalse($result['safe']);
    }

    // --- Safe groups with quantifiers ---

    public function testSafeQuantifiedGroup(): void
    {
        $result = ExpressionParser::validateRegex('(abc)+');
        $this->assertTrue($result['safe']);
    }

    public function testSafeAlternationGroup(): void
    {
        $result = ExpressionParser::validateRegex('(a|b)*');
        $this->assertTrue($result['safe']);
    }
}
