<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

namespace Alap\Tests;

use PHPUnit\Framework\TestCase;
use Alap\LinkProvenance;
use Alap\SanitizeByTier;

class SanitizeByTierTest extends TestCase
{
    private function stampedLink(string $tier): array
    {
        return LinkProvenance::stamp(['url' => '/a'], $tier);
    }

    // ------------------------------------------------------------------
    // SanitizeByTier::url — author tier
    // ------------------------------------------------------------------

    public function testUrlAuthorKeepsHttps(): void
    {
        $this->assertSame(
            'https://example.com',
            SanitizeByTier::url('https://example.com', $this->stampedLink('author')),
        );
    }

    public function testUrlAuthorKeepsHttp(): void
    {
        $this->assertSame(
            'http://example.com',
            SanitizeByTier::url('http://example.com', $this->stampedLink('author')),
        );
    }

    public function testUrlAuthorKeepsTel(): void
    {
        $this->assertSame(
            'tel:+15551234',
            SanitizeByTier::url('tel:+15551234', $this->stampedLink('author')),
        );
    }

    public function testUrlAuthorKeepsMailto(): void
    {
        $this->assertSame(
            'mailto:a@b.com',
            SanitizeByTier::url('mailto:a@b.com', $this->stampedLink('author')),
        );
    }

    public function testUrlAuthorKeepsCustomScheme(): void
    {
        $this->assertSame(
            'obsidian://open?vault=foo',
            SanitizeByTier::url('obsidian://open?vault=foo', $this->stampedLink('author')),
        );
    }

    public function testUrlAuthorStillBlocksJavascript(): void
    {
        $this->assertSame(
            'about:blank',
            SanitizeByTier::url('javascript:alert(1)', $this->stampedLink('author')),
        );
    }

    public function testUrlAuthorStillBlocksData(): void
    {
        $this->assertSame(
            'about:blank',
            SanitizeByTier::url('data:text/html,x', $this->stampedLink('author')),
        );
    }

    public function testUrlAuthorKeepsRelative(): void
    {
        $this->assertSame(
            '/foo/bar',
            SanitizeByTier::url('/foo/bar', $this->stampedLink('author')),
        );
    }

    // ------------------------------------------------------------------
    // SanitizeByTier::url — storage tier
    // ------------------------------------------------------------------

    public function testUrlStorageRemoteKeepsHttps(): void
    {
        $this->assertSame(
            'https://example.com',
            SanitizeByTier::url('https://example.com', $this->stampedLink('storage:remote')),
        );
    }

    public function testUrlStorageRemoteKeepsMailto(): void
    {
        $this->assertSame(
            'mailto:a@b.com',
            SanitizeByTier::url('mailto:a@b.com', $this->stampedLink('storage:remote')),
        );
    }

    public function testUrlStorageRemoteRejectsTel(): void
    {
        $this->assertSame(
            'about:blank',
            SanitizeByTier::url('tel:+15551234', $this->stampedLink('storage:remote')),
        );
    }

    public function testUrlStorageRemoteRejectsCustomScheme(): void
    {
        $this->assertSame(
            'about:blank',
            SanitizeByTier::url('obsidian://open?vault=foo', $this->stampedLink('storage:remote')),
        );
    }

    public function testUrlStorageLocalRejectsTel(): void
    {
        $this->assertSame(
            'about:blank',
            SanitizeByTier::url('tel:+15551234', $this->stampedLink('storage:local')),
        );
    }

    public function testUrlStorageRemoteStillBlocksJavascript(): void
    {
        $this->assertSame(
            'about:blank',
            SanitizeByTier::url('javascript:alert(1)', $this->stampedLink('storage:remote')),
        );
    }

    // ------------------------------------------------------------------
    // SanitizeByTier::url — protocol tier
    // ------------------------------------------------------------------

    public function testUrlProtocolKeepsHttps(): void
    {
        $this->assertSame(
            'https://example.com',
            SanitizeByTier::url('https://example.com', $this->stampedLink('protocol:web')),
        );
    }

    public function testUrlProtocolRejectsTel(): void
    {
        $this->assertSame(
            'about:blank',
            SanitizeByTier::url('tel:+15551234', $this->stampedLink('protocol:web')),
        );
    }

    public function testUrlProtocolRejectsCustomScheme(): void
    {
        $this->assertSame(
            'about:blank',
            SanitizeByTier::url('obsidian://open', $this->stampedLink('protocol:atproto')),
        );
    }

    public function testUrlProtocolBlocksJavascript(): void
    {
        $this->assertSame(
            'about:blank',
            SanitizeByTier::url('javascript:alert(1)', $this->stampedLink('protocol:web')),
        );
    }

    // ------------------------------------------------------------------
    // SanitizeByTier::url — unstamped (fail-closed)
    // ------------------------------------------------------------------

    public function testUrlUnstampedRejectsTel(): void
    {
        $link = ['url' => '/a'];
        $this->assertSame('about:blank', SanitizeByTier::url('tel:+15551234', $link));
    }

    public function testUrlUnstampedKeepsHttps(): void
    {
        $link = ['url' => '/a'];
        $this->assertSame('https://example.com', SanitizeByTier::url('https://example.com', $link));
    }

    public function testUrlUnstampedBlocksJavascript(): void
    {
        $link = ['url' => '/a'];
        $this->assertSame('about:blank', SanitizeByTier::url('javascript:alert(1)', $link));
    }

    // ------------------------------------------------------------------
    // SanitizeByTier::cssClass
    // ------------------------------------------------------------------

    public function testCssClassAuthorKeepsClass(): void
    {
        $this->assertSame('my-class', SanitizeByTier::cssClass('my-class', $this->stampedLink('author')));
    }

    public function testCssClassAuthorKeepsMultiWord(): void
    {
        $this->assertSame(
            'primary special',
            SanitizeByTier::cssClass('primary special', $this->stampedLink('author')),
        );
    }

    public function testCssClassAuthorNullStaysNull(): void
    {
        $this->assertNull(SanitizeByTier::cssClass(null, $this->stampedLink('author')));
    }

    public function testCssClassStorageRemoteDropsClass(): void
    {
        $this->assertNull(SanitizeByTier::cssClass('my-class', $this->stampedLink('storage:remote')));
    }

    public function testCssClassStorageLocalDropsClass(): void
    {
        $this->assertNull(SanitizeByTier::cssClass('my-class', $this->stampedLink('storage:local')));
    }

    public function testCssClassProtocolDropsClass(): void
    {
        $this->assertNull(SanitizeByTier::cssClass('my-class', $this->stampedLink('protocol:web')));
    }

    public function testCssClassProtocolNullStaysNull(): void
    {
        $this->assertNull(SanitizeByTier::cssClass(null, $this->stampedLink('protocol:web')));
    }

    public function testCssClassUnstampedDropsClass(): void
    {
        $link = ['url' => '/a'];
        $this->assertNull(SanitizeByTier::cssClass('my-class', $link));
    }

    // ------------------------------------------------------------------
    // SanitizeByTier::targetWindow
    // ------------------------------------------------------------------

    public function testTargetWindowAuthorKeepsSelf(): void
    {
        $this->assertSame('_self', SanitizeByTier::targetWindow('_self', $this->stampedLink('author')));
    }

    public function testTargetWindowAuthorKeepsBlank(): void
    {
        $this->assertSame('_blank', SanitizeByTier::targetWindow('_blank', $this->stampedLink('author')));
    }

    public function testTargetWindowAuthorKeepsNamedWindow(): void
    {
        $this->assertSame('fromAlap', SanitizeByTier::targetWindow('fromAlap', $this->stampedLink('author')));
    }

    public function testTargetWindowAuthorPassesNullThrough(): void
    {
        // Author-tier intentionally preserves null so the caller's
        // fallback chain still applies.
        $this->assertNull(SanitizeByTier::targetWindow(null, $this->stampedLink('author')));
    }

    public function testTargetWindowStorageClampsSelfToBlank(): void
    {
        $this->assertSame(
            '_blank',
            SanitizeByTier::targetWindow('_self', $this->stampedLink('storage:remote')),
        );
    }

    public function testTargetWindowStorageClampsNamedWindowToBlank(): void
    {
        $this->assertSame(
            '_blank',
            SanitizeByTier::targetWindow('fromAlap', $this->stampedLink('storage:remote')),
        );
    }

    public function testTargetWindowStorageClampsNullToBlank(): void
    {
        // Non-author tier forces _blank even when input is null.
        $this->assertSame(
            '_blank',
            SanitizeByTier::targetWindow(null, $this->stampedLink('storage:remote')),
        );
    }

    public function testTargetWindowStorageLocalClamps(): void
    {
        $this->assertSame(
            '_blank',
            SanitizeByTier::targetWindow('_parent', $this->stampedLink('storage:local')),
        );
    }

    public function testTargetWindowProtocolClamps(): void
    {
        $this->assertSame(
            '_blank',
            SanitizeByTier::targetWindow('fromAlap', $this->stampedLink('protocol:web')),
        );
    }

    public function testTargetWindowUnstampedClamps(): void
    {
        $link = ['url' => '/a'];
        $this->assertSame('_blank', SanitizeByTier::targetWindow('_self', $link));
    }

    public function testTargetWindowUnstampedNullClamps(): void
    {
        $link = ['url' => '/a'];
        $this->assertSame('_blank', SanitizeByTier::targetWindow(null, $link));
    }
}
