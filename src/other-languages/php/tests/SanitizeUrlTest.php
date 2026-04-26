<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

/**
 * Tests for ExpressionParser::sanitizeUrl / sanitizeUrlStrict /
 * sanitizeUrlWithSchemes — Ruby / Python port parity.
 */

namespace Alap\Tests;

use PHPUnit\Framework\TestCase;
use Alap\ExpressionParser;

class SanitizeUrlTest extends TestCase
{
    // --------------------------------------------------------------
    // sanitizeUrl — loose
    // --------------------------------------------------------------

    public function testLooseHttpsPasses(): void
    {
        $this->assertSame('https://example.com', ExpressionParser::sanitizeUrl('https://example.com'));
    }

    public function testLooseHttpPasses(): void
    {
        $this->assertSame('http://example.com', ExpressionParser::sanitizeUrl('http://example.com'));
    }

    public function testLooseMailtoPasses(): void
    {
        $this->assertSame('mailto:a@b.com', ExpressionParser::sanitizeUrl('mailto:a@b.com'));
    }

    public function testLooseTelPasses(): void
    {
        $this->assertSame('tel:+15551234', ExpressionParser::sanitizeUrl('tel:+15551234'));
    }

    public function testLooseRelativePasses(): void
    {
        $this->assertSame('/foo/bar', ExpressionParser::sanitizeUrl('/foo/bar'));
    }

    public function testLooseEmptyPasses(): void
    {
        $this->assertSame('', ExpressionParser::sanitizeUrl(''));
    }

    public function testLooseJavascriptBlocked(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl('javascript:alert(1)'));
    }

    public function testLooseJavascriptCaseInsensitive(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl('JAVASCRIPT:alert(1)'));
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl('JavaScript:alert(1)'));
    }

    public function testLooseDataBlocked(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl('data:text/html,x'));
    }

    public function testLooseVbscriptBlocked(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl('vbscript:alert(1)'));
    }

    public function testLooseBlobBlocked(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl('blob:https://example.com/abc'));
    }

    public function testLooseControlCharDisguisedNewline(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl("java\nscript:alert(1)"));
    }

    public function testLooseControlCharDisguisedTab(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl("java\tscript:alert(1)"));
    }

    public function testLooseControlCharDisguisedNull(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl("java\x00script:alert(1)"));
    }

    public function testLooseWhitespaceBeforeColonBlocked(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl('javascript :alert(1)'));
    }

    // --------------------------------------------------------------
    // sanitizeUrlStrict — http / https / mailto only
    // --------------------------------------------------------------

    public function testStrictHttpsPasses(): void
    {
        $this->assertSame('https://example.com', ExpressionParser::sanitizeUrlStrict('https://example.com'));
    }

    public function testStrictHttpPasses(): void
    {
        $this->assertSame('http://example.com', ExpressionParser::sanitizeUrlStrict('http://example.com'));
    }

    public function testStrictMailtoPasses(): void
    {
        $this->assertSame('mailto:a@b.com', ExpressionParser::sanitizeUrlStrict('mailto:a@b.com'));
    }

    public function testStrictRelativePasses(): void
    {
        $this->assertSame('/foo', ExpressionParser::sanitizeUrlStrict('/foo'));
    }

    public function testStrictEmptyPasses(): void
    {
        $this->assertSame('', ExpressionParser::sanitizeUrlStrict(''));
    }

    public function testStrictTelBlocked(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrlStrict('tel:+15551234'));
    }

    public function testStrictFtpBlocked(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrlStrict('ftp://example.com'));
    }

    public function testStrictCustomSchemeBlocked(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrlStrict('obsidian://open?vault=foo'));
    }

    public function testStrictJavascriptStillBlocked(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrlStrict('javascript:alert(1)'));
    }

    public function testStrictDataStillBlocked(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrlStrict('data:text/html,x'));
    }

    public function testStrictControlCharDisguisedStillBlocked(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrlStrict("java\nscript:alert(1)"));
    }

    // --------------------------------------------------------------
    // sanitizeUrlWithSchemes — configurable allowlist
    // --------------------------------------------------------------

    public function testWithSchemesDefaultAllowsHttpHttps(): void
    {
        $this->assertSame('http://example.com', ExpressionParser::sanitizeUrlWithSchemes('http://example.com'));
        $this->assertSame('https://example.com', ExpressionParser::sanitizeUrlWithSchemes('https://example.com'));
    }

    public function testWithSchemesDefaultBlocksMailto(): void
    {
        // Default allowlist is http / https only
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrlWithSchemes('mailto:a@b.com'));
    }

    public function testWithSchemesCustomAllowlistPermitsObsidian(): void
    {
        $this->assertSame(
            'obsidian://open?vault=foo',
            ExpressionParser::sanitizeUrlWithSchemes('obsidian://open?vault=foo', ['http', 'https', 'obsidian']),
        );
    }

    public function testWithSchemesCustomAllowlistBlocksUnlisted(): void
    {
        $this->assertSame(
            'about:blank',
            ExpressionParser::sanitizeUrlWithSchemes('ftp://example.com', ['http', 'https']),
        );
    }

    public function testWithSchemesRelativePassesRegardless(): void
    {
        $this->assertSame('/foo', ExpressionParser::sanitizeUrlWithSchemes('/foo', ['http']));
    }

    public function testWithSchemesDangerousBlockedEvenIfInAllowlist(): void
    {
        // Defence-in-depth: dangerous-scheme blocklist runs first.
        $this->assertSame(
            'about:blank',
            ExpressionParser::sanitizeUrlWithSchemes('javascript:alert(1)', ['javascript']),
        );
    }

    public function testWithSchemesEmptyAllowlistRejectsSchemeBearing(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrlWithSchemes('http://example.com', []));
    }

    public function testWithSchemesEmptyAllowlistPassesRelative(): void
    {
        $this->assertSame('/foo', ExpressionParser::sanitizeUrlWithSchemes('/foo', []));
    }

    public function testWithSchemesCaseInsensitiveSchemeMatch(): void
    {
        $this->assertSame(
            'HTTPS://example.com',
            ExpressionParser::sanitizeUrlWithSchemes('HTTPS://example.com', ['https']),
        );
    }
}
