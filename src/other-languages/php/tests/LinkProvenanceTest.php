<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

namespace Alap\Tests;

use PHPUnit\Framework\TestCase;
use Alap\LinkProvenance;

class LinkProvenanceTest extends TestCase
{
    // ------------------------------------------------------------------
    // stamp + get
    // ------------------------------------------------------------------

    public function testStampAuthorThenRead(): void
    {
        $link = LinkProvenance::stamp(['url' => '/a'], 'author');
        $this->assertSame('author', LinkProvenance::get($link));
    }

    public function testStampStorageLocal(): void
    {
        $link = LinkProvenance::stamp(['url' => '/a'], 'storage:local');
        $this->assertSame('storage:local', LinkProvenance::get($link));
    }

    public function testStampStorageRemote(): void
    {
        $link = LinkProvenance::stamp(['url' => '/a'], 'storage:remote');
        $this->assertSame('storage:remote', LinkProvenance::get($link));
    }

    public function testStampProtocol(): void
    {
        $link = LinkProvenance::stamp(['url' => '/a'], 'protocol:web');
        $this->assertSame('protocol:web', LinkProvenance::get($link));
    }

    public function testUnstampedReturnsNull(): void
    {
        $this->assertNull(LinkProvenance::get(['url' => '/a']));
    }

    public function testStampOverwritesExisting(): void
    {
        $link = LinkProvenance::stamp(['url' => '/a'], 'author');
        $link = LinkProvenance::stamp($link, 'protocol:web');
        $this->assertSame('protocol:web', LinkProvenance::get($link));
    }

    public function testStampUsesReservedKey(): void
    {
        $link = LinkProvenance::stamp(['url' => '/a'], 'author');
        $this->assertArrayHasKey(LinkProvenance::PROVENANCE_KEY, $link);
        $this->assertSame('author', $link[LinkProvenance::PROVENANCE_KEY]);
    }

    public function testStampReturnsNewArrayWithoutMutating(): void
    {
        // PHP arrays are value-typed, so the original must stay unstamped
        // even though the returned array carries the stamp.
        $original = ['url' => '/a'];
        $stamped = LinkProvenance::stamp($original, 'author');
        $this->assertSame('author', LinkProvenance::get($stamped));
        $this->assertNull(LinkProvenance::get($original));
    }

    // ------------------------------------------------------------------
    // Invalid tier rejection
    // ------------------------------------------------------------------

    public function testRejectsUnknownTier(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        LinkProvenance::stamp(['url' => '/a'], 'admin');
    }

    public function testRejectsTypoAuthor(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        LinkProvenance::stamp(['url' => '/a'], 'Author');
    }

    public function testRejectsEmpty(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        LinkProvenance::stamp(['url' => '/a'], '');
    }

    public function testRejectsBareProtocolPrefix(): void
    {
        // "protocol:" with nothing after must be rejected — it is not a
        // valid handler name.
        $this->expectException(\InvalidArgumentException::class);
        LinkProvenance::stamp(['url' => '/a'], 'protocol:');
    }

    public function testAcceptsAnyProtocolSuffix(): void
    {
        $link = LinkProvenance::stamp(['url' => '/a'], 'protocol:custom_handler_42');
        $this->assertSame('protocol:custom_handler_42', LinkProvenance::get($link));
    }

    // ------------------------------------------------------------------
    // Tier predicates
    // ------------------------------------------------------------------

    public function testAuthorTruePredicate(): void
    {
        $link = LinkProvenance::stamp(['url' => '/a'], 'author');
        $this->assertTrue(LinkProvenance::isAuthorTier($link));
        $this->assertFalse(LinkProvenance::isStorageTier($link));
        $this->assertFalse(LinkProvenance::isProtocolTier($link));
    }

    public function testStorageTrueForLocal(): void
    {
        $link = LinkProvenance::stamp(['url' => '/a'], 'storage:local');
        $this->assertFalse(LinkProvenance::isAuthorTier($link));
        $this->assertTrue(LinkProvenance::isStorageTier($link));
        $this->assertFalse(LinkProvenance::isProtocolTier($link));
    }

    public function testStorageTrueForRemote(): void
    {
        $link = LinkProvenance::stamp(['url' => '/a'], 'storage:remote');
        $this->assertTrue(LinkProvenance::isStorageTier($link));
    }

    public function testProtocolTrueForProtocolWeb(): void
    {
        $link = LinkProvenance::stamp(['url' => '/a'], 'protocol:web');
        $this->assertFalse(LinkProvenance::isAuthorTier($link));
        $this->assertFalse(LinkProvenance::isStorageTier($link));
        $this->assertTrue(LinkProvenance::isProtocolTier($link));
    }

    public function testAllFalseForUnstamped(): void
    {
        $link = ['url' => '/a'];
        $this->assertFalse(LinkProvenance::isAuthorTier($link));
        $this->assertFalse(LinkProvenance::isStorageTier($link));
        $this->assertFalse(LinkProvenance::isProtocolTier($link));
    }

    // ------------------------------------------------------------------
    // cloneTo
    // ------------------------------------------------------------------

    public function testCloneToCopiesStamp(): void
    {
        $src = LinkProvenance::stamp(['url' => '/a'], 'protocol:web');
        $dest = LinkProvenance::cloneTo($src, ['url' => '/b']);
        $this->assertSame('protocol:web', LinkProvenance::get($dest));
    }

    public function testCloneToNoOpWhenSrcUnstamped(): void
    {
        $src = ['url' => '/a'];
        $dest = LinkProvenance::cloneTo($src, ['url' => '/b']);
        $this->assertNull(LinkProvenance::get($dest));
        $this->assertArrayNotHasKey(LinkProvenance::PROVENANCE_KEY, $dest);
    }

    public function testCloneToOverwritesExistingDestStamp(): void
    {
        $src = LinkProvenance::stamp(['url' => '/a'], 'storage:remote');
        $dest = LinkProvenance::stamp(['url' => '/b'], 'author');
        $dest = LinkProvenance::cloneTo($src, $dest);
        $this->assertSame('storage:remote', LinkProvenance::get($dest));
    }
}
