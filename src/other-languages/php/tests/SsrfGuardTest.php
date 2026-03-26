<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

/**
 * Tests for ExpressionParser::isPrivateHost() — SSRF guard.
 * Mirrors the same pattern used across all language ports.
 */

namespace Alap\Tests;

use PHPUnit\Framework\TestCase;
use Alap\ExpressionParser;

class SsrfGuardTest extends TestCase
{
    // --- Public addresses (not private) ---

    public function testPublicIp(): void
    {
        $this->assertFalse(ExpressionParser::isPrivateHost('https://93.184.216.34/path'));
    }

    public function testPublicDomain(): void
    {
        $this->assertFalse(ExpressionParser::isPrivateHost('https://example.com/path'));
    }

    // --- Private / reserved addresses ---

    public function testLocalhost(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://localhost/'));
    }

    public function testLocalhostWithPort(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://localhost:8080/'));
    }

    public function testSubdomainLocalhost(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://foo.localhost/'));
    }

    public function testLoopback127(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://127.0.0.1/'));
    }

    public function testPrivate10(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://10.0.0.1/'));
    }

    public function testPrivate172(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://172.16.0.1/'));
    }

    public function testPrivate192(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://192.168.1.1/'));
    }

    public function testLinkLocal169(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://169.254.169.254/'));
    }

    public function testIpv6Loopback(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://[::1]/'));
    }

    public function testMalformedUrl(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('not-a-url'));
    }

    // --- IPv4-mapped IPv6 ---

    public function testIpv4MappedIpv6Loopback(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://[::ffff:127.0.0.1]/'));
    }

    public function testIpv4MappedIpv6Private(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://[::ffff:10.0.0.1]/'));
    }

    // --- 0.0.0.0 bypass ---

    public function testZeroAddress(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://0.0.0.0/'));
    }

    public function testZeroAddressWithPort(): void
    {
        $this->assertTrue(ExpressionParser::isPrivateHost('http://0.0.0.0:8080/'));
    }
}
