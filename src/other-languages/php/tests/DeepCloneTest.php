<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

namespace Alap\Tests;

use PHPUnit\Framework\TestCase;
use Alap\ConfigCloneError;
use Alap\DeepClone;

class DeepCloneTest extends TestCase
{
    // ------------------------------------------------------------------
    // Allowed shapes
    // ------------------------------------------------------------------

    public function testEmptyAssocArray(): void
    {
        $this->assertSame([], DeepClone::call([]));
    }

    public function testFlatAssocArray(): void
    {
        $src = ['url' => '/a', 'label' => 'A'];
        $this->assertSame($src, DeepClone::call($src));
    }

    public function testNestedAssocArray(): void
    {
        $src = ['outer' => ['inner' => ['leaf' => 42]]];
        $this->assertSame($src, DeepClone::call($src));
    }

    public function testListArray(): void
    {
        $this->assertSame([1, 2, 3], DeepClone::call([1, 2, 3]));
    }

    public function testMixed(): void
    {
        $src = [
            'allLinks' => [
                'a' => ['url' => '/a', 'tags' => ['nyc', 'coffee'], 'meta' => ['rank' => 1]],
            ],
        ];
        $this->assertSame($src, DeepClone::call($src));
    }

    public function testPrimitivesPassThrough(): void
    {
        $this->assertSame('hello', DeepClone::call('hello'));
        $this->assertSame(42, DeepClone::call(42));
        $this->assertSame(3.14, DeepClone::call(3.14));
        $this->assertTrue(DeepClone::call(true));
        $this->assertFalse(DeepClone::call(false));
        $this->assertNull(DeepClone::call(null));
    }

    // ------------------------------------------------------------------
    // Detachment
    // ------------------------------------------------------------------

    public function testInputNotMutatedByClone(): void
    {
        // PHP arrays are value-typed, so this is trivially true, but
        // the assertion documents the intent.
        $src = ['url' => '/a', 'tags' => ['x']];
        $snapshot = $src;
        DeepClone::call($src);
        $this->assertSame($snapshot, $src);
    }

    public function testMutationOfOutputDoesNotAffectInput(): void
    {
        $src = ['tags' => ['x', 'y']];
        $out = DeepClone::call($src);
        $out['tags'][] = 'z';
        $this->assertSame(['x', 'y'], $src['tags']);
    }

    // ------------------------------------------------------------------
    // Rejections
    // ------------------------------------------------------------------

    public function testRejectsClosure(): void
    {
        $this->expectException(ConfigCloneError::class);
        DeepClone::call(['handler' => function ($x) { return $x; }]);
    }

    public function testRejectsArrowFunction(): void
    {
        $this->expectException(ConfigCloneError::class);
        DeepClone::call(['handler' => fn ($x) => $x]);
    }

    public function testRejectsInvokableObject(): void
    {
        $invokable = new class {
            public function __invoke($x) { return $x; }
        };
        $this->expectException(ConfigCloneError::class);
        DeepClone::call(['handler' => $invokable]);
    }

    public function testRejectsPlainObject(): void
    {
        $this->expectException(ConfigCloneError::class);
        DeepClone::call(['obj' => new \stdClass()]);
    }

    public function testRejectsResource(): void
    {
        $resource = fopen('php://memory', 'r');
        try {
            $this->expectException(ConfigCloneError::class);
            DeepClone::call(['r' => $resource]);
        } finally {
            fclose($resource);
        }
    }

    public function testRejectsNonStringArrayKeyInAssoc(): void
    {
        // Mixed-key arrays (assoc with int keys) trigger the String-key check.
        // Pure sequential arrays (array_is_list = true) are accepted as lists.
        $this->expectException(ConfigCloneError::class);
        DeepClone::call(['a' => 1, 2 => 'value']);
    }

    public function testSharedReferenceNotRejected(): void
    {
        // PHP arrays are value-typed, so "shared" means same content; the
        // clone produces independent copies either way.
        $shared = ['rank' => 1];
        $src = ['a' => $shared, 'b' => $shared];
        $out = DeepClone::call($src);
        $this->assertSame(['a' => ['rank' => 1], 'b' => ['rank' => 1]], $out);
    }

    // ------------------------------------------------------------------
    // Resource bounds
    // ------------------------------------------------------------------

    public function testDepthAtLimitOk(): void
    {
        // 65 arrays deep — depths 0..64 — passes because check is depth > 64.
        $payload = [];
        $current = &$payload;
        for ($i = 0; $i < 64; $i++) {
            $current['nested'] = [];
            $current = &$current['nested'];
        }
        $this->assertIsArray(DeepClone::call($payload));
    }

    public function testDepthOverLimitRejected(): void
    {
        $payload = [];
        $current = &$payload;
        for ($i = 0; $i < 65; $i++) {
            $current['nested'] = [];
            $current = &$current['nested'];
        }
        $this->expectException(ConfigCloneError::class);
        DeepClone::call($payload);
    }

    public function testNodeCountAtLimitOk(): void
    {
        // 1 list + 9,999 empty assoc arrays = 10,000 nodes, at cap.
        $payload = array_fill(0, 9_999, (object) []);
        // Using objects above would reject — convert to empty arrays.
        $payload = [];
        for ($i = 0; $i < 9_999; $i++) {
            $payload[] = [];
        }
        $out = DeepClone::call($payload);
        $this->assertCount(9_999, $out);
    }

    public function testNodeCountOverLimitRejected(): void
    {
        $payload = [];
        for ($i = 0; $i < 10_001; $i++) {
            $payload[] = [];
        }
        $this->expectException(ConfigCloneError::class);
        DeepClone::call($payload);
    }

    public function testPrimitivesDoNotCountAsNodes(): void
    {
        $payload = [];
        for ($i = 0; $i < 20_000; $i++) {
            $payload["k{$i}"] = $i;
        }
        $out = DeepClone::call($payload);
        $this->assertCount(20_000, $out);
    }

    // ------------------------------------------------------------------
    // Blocked keys
    // ------------------------------------------------------------------

    public function testProtoKeySilentlySkipped(): void
    {
        $payload = ['url' => '/a', '__proto__' => ['hacked' => true]];
        $out = DeepClone::call($payload);
        $this->assertArrayHasKey('url', $out);
        $this->assertArrayNotHasKey('__proto__', $out);
    }

    public function testConstructorKeySilentlySkipped(): void
    {
        $out = DeepClone::call(['url' => '/a', 'constructor' => ['bad' => true]]);
        $this->assertArrayNotHasKey('constructor', $out);
    }

    public function testPrototypeKeySilentlySkipped(): void
    {
        $out = DeepClone::call(['url' => '/a', 'prototype' => ['bad' => true]]);
        $this->assertArrayNotHasKey('prototype', $out);
    }

    public function testPythonDunderKeysSilentlySkipped(): void
    {
        $out = DeepClone::call(['url' => '/a', '__class__' => ['bad' => true]]);
        $this->assertArrayNotHasKey('__class__', $out);
    }

    public function testBlockedKeysDoNotCountAsNodes(): void
    {
        $pathological = [];
        $current = &$pathological;
        for ($i = 0; $i < 200; $i++) {
            $current['nested'] = [];
            $current = &$current['nested'];
        }
        unset($current);
        $payload = ['url' => '/a', '__proto__' => $pathological];
        $out = DeepClone::call($payload);
        $this->assertSame(['url' => '/a'], $out);
    }
}
