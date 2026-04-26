<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

/**
 * Tests for Alap\ValidateConfig::call() — mirrors the TS test tier.
 */

namespace Alap\Tests;

use PHPUnit\Framework\TestCase;
use Alap\ConfigMigrationError;
use Alap\ExpressionParser;
use Alap\LinkProvenance;
use Alap\ValidateConfig;

class ValidateConfigTest extends TestCase
{
    // --- Valid configs pass through ---

    public function testMinimalValidConfig(): void
    {
        $config = [
            'allLinks' => [
                'brooklyn' => [
                    'label' => 'Brooklyn Bridge',
                    'url' => 'https://example.com/brooklyn',
                    'tags' => ['nyc'],
                ],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertSame('Brooklyn Bridge', $result['allLinks']['brooklyn']['label']);
        $this->assertSame('https://example.com/brooklyn', $result['allLinks']['brooklyn']['url']);
        $this->assertSame(['nyc'], $result['allLinks']['brooklyn']['tags']);
    }

    public function testPreservesSettingsMacrosSearchPatterns(): void
    {
        $config = [
            'settings' => ['listType' => 'ul', 'menuTimeout' => 5000],
            'macros' => ['fav' => ['linkItems' => '.coffee']],
            'searchPatterns' => [
                'wiki' => ['pattern' => 'wikipedia\\.org', 'options' => ['fields' => 'u']],
            ],
            'allLinks' => ['a' => ['label' => 'A', 'url' => '/a']],
        ];
        $result = ValidateConfig::call($config);
        $this->assertSame('ul', $result['settings']['listType']);
        $this->assertSame('.coffee', $result['macros']['fav']['linkItems']);
        $this->assertArrayHasKey('wiki', $result['searchPatterns']);
    }

    // --- Structural validation ---

    public function testThrowsOnNullInput(): void
    {
        $this->expectException(\TypeError::class);
        // PHP type hint enforces array; passing null triggers a TypeError.
        ValidateConfig::call(null);
    }

    public function testThrowsOnNonArrayInput(): void
    {
        $this->expectException(\TypeError::class);
        // Passing a string triggers a TypeError due to the array type hint.
        ValidateConfig::call('not a config');
    }

    public function testThrowsOnMissingAllLinks(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ValidateConfig::call(['settings' => []]);
    }

    public function testThrowsOnAllLinksAsList(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ValidateConfig::call(['allLinks' => ['one', 'two']]);
    }

    // --- Link filtering ---

    public function testSkipsLinksWithMissingUrl(): void
    {
        $config = [
            'allLinks' => [
                'noUrl' => ['label' => 'No URL'],
                'valid' => ['label' => 'Valid', 'url' => '/valid'],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertArrayHasKey('valid', $result['allLinks']);
        $this->assertArrayNotHasKey('noUrl', $result['allLinks']);
    }

    public function testSkipsNonArrayLinks(): void
    {
        $config = [
            'allLinks' => [
                'bad' => 'not an array',
                'valid' => ['label' => 'Valid', 'url' => '/valid'],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertArrayHasKey('valid', $result['allLinks']);
        $this->assertArrayNotHasKey('bad', $result['allLinks']);
    }

    // --- URL sanitization ---

    public function testSanitizesJavascriptUrls(): void
    {
        $config = [
            'allLinks' => [
                'xss' => ['label' => 'XSS', 'url' => 'javascript:alert(1)'],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertSame('about:blank', $result['allLinks']['xss']['url']);
    }

    public function testSanitizesJavascriptInImage(): void
    {
        $config = [
            'allLinks' => [
                'img' => ['label' => 'Img', 'url' => '/safe', 'image' => 'javascript:alert(1)'],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertSame('about:blank', $result['allLinks']['img']['image']);
    }

    public function testLeavesSafeUrlsUnchanged(): void
    {
        $config = [
            'allLinks' => [
                'safe' => ['label' => 'Safe', 'url' => 'https://example.com'],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertSame('https://example.com', $result['allLinks']['safe']['url']);
    }

    // --- Tags validation ---

    public function testFiltersNonStringTags(): void
    {
        $config = [
            'allLinks' => [
                'item' => ['label' => 'Item', 'url' => '/item', 'tags' => ['good', 42, null, 'also_good']],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertSame(['good', 'also_good'], $result['allLinks']['item']['tags']);
    }

    public function testIgnoresNonArrayTags(): void
    {
        $config = [
            'allLinks' => [
                'item' => ['label' => 'Item', 'url' => '/item', 'tags' => 'not-an-array'],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertArrayNotHasKey('tags', $result['allLinks']['item']);
    }

    // --- Hyphen rejection ---

    public function testSkipsHyphenatedItemIds(): void
    {
        $config = [
            'allLinks' => [
                'good_item' => ['label' => 'Good', 'url' => '/good'],
                'bad-item' => ['label' => 'Bad', 'url' => '/bad'],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertArrayHasKey('good_item', $result['allLinks']);
        $this->assertArrayNotHasKey('bad-item', $result['allLinks']);
    }

    public function testSkipsHyphenatedMacroNames(): void
    {
        $config = [
            'allLinks' => ['a' => ['label' => 'A', 'url' => '/a']],
            'macros' => [
                'good_macro' => ['linkItems' => '.tag'],
                'bad-macro' => ['linkItems' => '.tag'],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertArrayHasKey('good_macro', $result['macros']);
        $this->assertArrayNotHasKey('bad-macro', $result['macros']);
    }

    public function testSkipsHyphenatedSearchPatternKeys(): void
    {
        $config = [
            'allLinks' => ['a' => ['label' => 'A', 'url' => '/a']],
            'searchPatterns' => [
                'good_pattern' => 'bridge',
                'bad-pattern' => 'bridge',
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertArrayHasKey('good_pattern', $result['searchPatterns']);
        $this->assertArrayNotHasKey('bad-pattern', $result['searchPatterns']);
    }

    public function testStripsHyphenatedTagsKeepsLink(): void
    {
        $config = [
            'allLinks' => [
                'item' => ['label' => 'Item', 'url' => '/item', 'tags' => ['good', 'bad-tag', 'also_good']],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertArrayHasKey('item', $result['allLinks']);
        $this->assertSame(['good', 'also_good'], $result['allLinks']['item']['tags']);
    }

    public function testAllowsHyphensInNonExpressionFields(): void
    {
        $config = [
            'allLinks' => [
                'item' => [
                    'label' => 'Blue Bottle - Oakland',
                    'url' => 'https://blue-bottle.com/my-page',
                    'cssClass' => 'card-style',
                    'description' => 'A high-end roaster',
                    'tags' => ['coffee'],
                ],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertSame('Blue Bottle - Oakland', $result['allLinks']['item']['label']);
        $this->assertSame('https://blue-bottle.com/my-page', $result['allLinks']['item']['url']);
        $this->assertSame('card-style', $result['allLinks']['item']['cssClass']);
        $this->assertSame('A high-end roaster', $result['allLinks']['item']['description']);
    }

    // --- Regex pattern validation ---

    public function testRemovesDangerousRegexPatterns(): void
    {
        $config = [
            'allLinks' => ['a' => ['label' => 'A', 'url' => '/a']],
            'searchPatterns' => [
                'safe' => 'bridge',
                'evil' => '(a+)+$',
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertSame('bridge', $result['searchPatterns']['safe']);
        $this->assertArrayNotHasKey('evil', $result['searchPatterns'] ?? []);
    }

    // --- Prototype pollution defense ---

    public function testDropsProtoKeys(): void
    {
        // In PHP, __proto__ is just a string key but we still block it for parity
        // with the JavaScript/TypeScript implementation.
        $config = [
            'allLinks' => [
                '__proto__' => ['label' => 'evil', 'url' => '/evil'],
                'safe' => ['label' => 'Safe', 'url' => '/safe'],
            ],
        ];
        $result = ValidateConfig::call($config);
        $this->assertArrayHasKey('safe', $result['allLinks']);
        $this->assertArrayNotHasKey('__proto__', $result['allLinks']);
    }

    // --- Immutability ---

    public function testDoesNotMutateInput(): void
    {
        $config = [
            'allLinks' => [
                'xss' => ['label' => 'XSS', 'url' => 'javascript:alert(1)'],
            ],
        ];
        $original = $config; // PHP arrays are copy-on-write
        ValidateConfig::call($config);
        $this->assertSame($original, $config);
    }

    // ------------------------------------------------------------------
    // 3.2 additions
    // ------------------------------------------------------------------

    private function minimalConfig(): array
    {
        return [
            'allLinks' => [
                'alpha' => ['url' => 'https://example.com/alpha', 'label' => 'Alpha'],
            ],
        ];
    }

    // --- Provenance stamping ---

    public function testProvenanceDefaultsToAuthor(): void
    {
        $result = ValidateConfig::call($this->minimalConfig());
        $link = $result['allLinks']['alpha'];
        $this->assertTrue(LinkProvenance::isAuthorTier($link));
        $this->assertSame('author', LinkProvenance::get($link));
    }

    public function testProvenanceStorageLocalStamp(): void
    {
        $result = ValidateConfig::call($this->minimalConfig(), 'storage:local');
        $this->assertTrue(LinkProvenance::isStorageTier($result['allLinks']['alpha']));
        $this->assertSame('storage:local', LinkProvenance::get($result['allLinks']['alpha']));
    }

    public function testProvenanceStorageRemoteStamp(): void
    {
        $result = ValidateConfig::call($this->minimalConfig(), 'storage:remote');
        $this->assertSame('storage:remote', LinkProvenance::get($result['allLinks']['alpha']));
    }

    public function testProvenanceProtocolStamp(): void
    {
        $result = ValidateConfig::call($this->minimalConfig(), 'protocol:web');
        $this->assertTrue(LinkProvenance::isProtocolTier($result['allLinks']['alpha']));
        $this->assertSame('protocol:web', LinkProvenance::get($result['allLinks']['alpha']));
    }

    public function testProvenanceStampCannotBePresetByInput(): void
    {
        // Input tries to pre-stamp itself as author while being loaded
        // from storage:remote. The whitelist filters _provenance out,
        // and stamp runs after whitelist.
        $cfg = [
            'allLinks' => [
                'a' => [
                    'url' => 'https://x.com',
                    LinkProvenance::PROVENANCE_KEY => 'author',
                ],
            ],
        ];
        $result = ValidateConfig::call($cfg, 'storage:remote');
        $this->assertSame('storage:remote', LinkProvenance::get($result['allLinks']['a']));
    }

    // --- Hooks allowlist ---

    public function testHooksAuthorKeepsAllVerbatim(): void
    {
        $cfg = [
            'allLinks' => [
                'a' => ['url' => '/a', 'hooks' => ['hover', 'click', 'anything']],
            ],
        ];
        $result = ValidateConfig::call($cfg);
        $this->assertSame(['hover', 'click', 'anything'], $result['allLinks']['a']['hooks']);
    }

    public function testHooksNonAuthorWithoutAllowlistStripsAll(): void
    {
        // No settings.hooks declared + non-author tier → fail-closed.
        $cfg = [
            'allLinks' => [
                'a' => ['url' => '/a', 'hooks' => ['hover', 'click']],
            ],
        ];
        $result = @ValidateConfig::call($cfg, 'storage:remote');
        $this->assertArrayNotHasKey('hooks', $result['allLinks']['a']);
    }

    public function testHooksNonAuthorIntersectsAgainstAllowlist(): void
    {
        $cfg = [
            'settings' => ['hooks' => ['hover']],
            'allLinks' => [
                'a' => ['url' => '/a', 'hooks' => ['hover', 'attacker_chosen']],
            ],
        ];
        $result = @ValidateConfig::call($cfg, 'protocol:web');
        $this->assertSame(['hover'], $result['allLinks']['a']['hooks']);
    }

    public function testHooksNonAuthorFullyStrippedWhenNoneMatch(): void
    {
        $cfg = [
            'settings' => ['hooks' => ['approved_hook']],
            'allLinks' => [
                'a' => ['url' => '/a', 'hooks' => ['evil', 'worse']],
            ],
        ];
        $result = @ValidateConfig::call($cfg, 'storage:remote');
        $this->assertArrayNotHasKey('hooks', $result['allLinks']['a']);
    }

    // --- assertNoHandlersInConfig ---

    public function testAssertNoHandlersRejectsGenerateClosure(): void
    {
        $this->expectException(ConfigMigrationError::class);
        ValidateConfig::assertNoHandlersInConfig([
            'protocols' => ['web' => ['generate' => function ($args) { return []; }]],
        ]);
    }

    public function testAssertNoHandlersRejectsFilterArrowFunction(): void
    {
        $this->expectException(ConfigMigrationError::class);
        ValidateConfig::assertNoHandlersInConfig([
            'protocols' => ['custom' => ['filter' => fn ($links) => $links]],
        ]);
    }

    public function testAssertNoHandlersRejectsInvokableHandler(): void
    {
        $invokable = new class {
            public function __invoke() { return []; }
        };
        $this->expectException(ConfigMigrationError::class);
        ValidateConfig::assertNoHandlersInConfig([
            'protocols' => ['custom' => ['handler' => $invokable]],
        ]);
    }

    public function testAssertNoHandlersPermitsDataOnlyProtocols(): void
    {
        ValidateConfig::assertNoHandlersInConfig([
            'protocols' => ['web' => ['keys' => ['books' => ['url' => '...']]]],
        ]);
        $this->assertTrue(true); // reached here without throwing
    }

    public function testAssertNoHandlersNoProtocolsFieldIsOk(): void
    {
        ValidateConfig::assertNoHandlersInConfig(['allLinks' => []]);
        $this->assertTrue(true);
    }

    public function testValidateConfigRaisesOnClosureInProtocols(): void
    {
        $cfg = [
            'allLinks' => ['a' => ['url' => '/a']],
            'protocols' => ['web' => ['generate' => fn () => []]],
        ];
        $this->expectException(ConfigMigrationError::class);
        ValidateConfig::call($cfg);
    }

    // --- Meta URL sanitization ---

    public function testMetaUrlKeySanitized(): void
    {
        $cfg = [
            'allLinks' => [
                'a' => [
                    'url' => '/a',
                    'meta' => ['iconUrl' => 'javascript:alert(1)'],
                ],
            ],
        ];
        $result = ValidateConfig::call($cfg);
        $this->assertSame('about:blank', $result['allLinks']['a']['meta']['iconUrl']);
    }

    public function testMetaUrlCaseInsensitiveMatch(): void
    {
        $cfg = [
            'allLinks' => [
                'a' => [
                    'url' => '/a',
                    'meta' => [
                        'ImageURL' => 'javascript:alert(1)',
                        'AvatarUrl' => 'data:text/html,x',
                    ],
                ],
            ],
        ];
        $result = ValidateConfig::call($cfg);
        $this->assertSame('about:blank', $result['allLinks']['a']['meta']['ImageURL']);
        $this->assertSame('about:blank', $result['allLinks']['a']['meta']['AvatarUrl']);
    }

    public function testMetaNonUrlKeyUntouched(): void
    {
        $cfg = [
            'allLinks' => [
                'a' => [
                    'url' => '/a',
                    'meta' => ['author' => 'Someone', 'rank' => 1, 'body' => 'plain text'],
                ],
            ],
        ];
        $result = ValidateConfig::call($cfg);
        $this->assertSame('Someone', $result['allLinks']['a']['meta']['author']);
        $this->assertSame(1, $result['allLinks']['a']['meta']['rank']);
    }

    public function testMetaBlockedKeysRecursed(): void
    {
        $cfg = [
            'allLinks' => [
                'a' => [
                    'url' => '/a',
                    'meta' => [
                        '__proto__' => ['bad' => true],
                        '__class__' => ['bad' => true],
                        'legit' => 'ok',
                    ],
                ],
            ],
        ];
        $result = ValidateConfig::call($cfg);
        $meta = $result['allLinks']['a']['meta'];
        $this->assertArrayNotHasKey('__proto__', $meta);
        $this->assertArrayNotHasKey('__class__', $meta);
        $this->assertSame('ok', $meta['legit']);
    }

    // --- Thumbnail sanitization ---

    public function testThumbnailSanitized(): void
    {
        $cfg = [
            'allLinks' => [
                'a' => ['url' => '/a', 'thumbnail' => 'javascript:alert(1)'],
            ],
        ];
        $result = ValidateConfig::call($cfg);
        $this->assertSame('about:blank', $result['allLinks']['a']['thumbnail']);
    }

    public function testThumbnailValidUrlPreserved(): void
    {
        $cfg = [
            'allLinks' => [
                'a' => ['url' => '/a', 'thumbnail' => 'https://example.com/thumb.jpg'],
            ],
        ];
        $result = ValidateConfig::call($cfg);
        $this->assertSame('https://example.com/thumb.jpg', $result['allLinks']['a']['thumbnail']);
    }

    // --- sanitizeLinkUrls helper (direct) ---

    public function testSanitizeLinkUrlsDirectCallSanitizesUrl(): void
    {
        $out = ValidateConfig::sanitizeLinkUrls(['url' => 'javascript:alert(1)']);
        $this->assertSame('about:blank', $out['url']);
    }

    public function testSanitizeLinkUrlsDirectCallSanitizesImage(): void
    {
        $out = ValidateConfig::sanitizeLinkUrls(['url' => '/a', 'image' => 'data:text/html,x']);
        $this->assertSame('about:blank', $out['image']);
    }

    public function testSanitizeLinkUrlsDirectCallSanitizesThumbnail(): void
    {
        $out = ValidateConfig::sanitizeLinkUrls(['url' => '/a', 'thumbnail' => 'vbscript:bad']);
        $this->assertSame('about:blank', $out['thumbnail']);
    }

    public function testSanitizeLinkUrlsDirectCallSanitizesMetaUrl(): void
    {
        $out = ValidateConfig::sanitizeLinkUrls([
            'url' => '/a',
            'meta' => ['coverUrl' => 'javascript:bad'],
        ]);
        $this->assertSame('about:blank', $out['meta']['coverUrl']);
    }

    public function testSanitizeLinkUrlsDirectCallStripsBlockedMetaKeys(): void
    {
        $out = ValidateConfig::sanitizeLinkUrls([
            'url' => '/a',
            'meta' => ['__proto__' => ['x' => 1], 'ok' => 'keep'],
        ]);
        $this->assertArrayNotHasKey('__proto__', $out['meta']);
        $this->assertSame('keep', $out['meta']['ok']);
    }
}
