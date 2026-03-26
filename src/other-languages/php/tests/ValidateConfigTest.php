<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

/**
 * Tests for ExpressionParser::validateConfig() — mirrors the TS test tier.
 */

namespace Alap\Tests;

use PHPUnit\Framework\TestCase;
use Alap\ExpressionParser;

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
        $result = ExpressionParser::validateConfig($config);
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
        $result = ExpressionParser::validateConfig($config);
        $this->assertSame('ul', $result['settings']['listType']);
        $this->assertSame('.coffee', $result['macros']['fav']['linkItems']);
        $this->assertArrayHasKey('wiki', $result['searchPatterns']);
    }

    // --- Structural validation ---

    public function testThrowsOnNullInput(): void
    {
        $this->expectException(\TypeError::class);
        // PHP type hint enforces array; passing null triggers a TypeError.
        ExpressionParser::validateConfig(null);
    }

    public function testThrowsOnNonArrayInput(): void
    {
        $this->expectException(\TypeError::class);
        // Passing a string triggers a TypeError due to the array type hint.
        ExpressionParser::validateConfig('not a config');
    }

    public function testThrowsOnMissingAllLinks(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ExpressionParser::validateConfig(['settings' => []]);
    }

    public function testThrowsOnAllLinksAsList(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        ExpressionParser::validateConfig(['allLinks' => ['one', 'two']]);
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
        $result = ExpressionParser::validateConfig($config);
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
        $result = ExpressionParser::validateConfig($config);
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
        $result = ExpressionParser::validateConfig($config);
        $this->assertSame('about:blank', $result['allLinks']['xss']['url']);
    }

    public function testSanitizesJavascriptInImage(): void
    {
        $config = [
            'allLinks' => [
                'img' => ['label' => 'Img', 'url' => '/safe', 'image' => 'javascript:alert(1)'],
            ],
        ];
        $result = ExpressionParser::validateConfig($config);
        $this->assertSame('about:blank', $result['allLinks']['img']['image']);
    }

    public function testLeavesSafeUrlsUnchanged(): void
    {
        $config = [
            'allLinks' => [
                'safe' => ['label' => 'Safe', 'url' => 'https://example.com'],
            ],
        ];
        $result = ExpressionParser::validateConfig($config);
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
        $result = ExpressionParser::validateConfig($config);
        $this->assertSame(['good', 'also_good'], $result['allLinks']['item']['tags']);
    }

    public function testIgnoresNonArrayTags(): void
    {
        $config = [
            'allLinks' => [
                'item' => ['label' => 'Item', 'url' => '/item', 'tags' => 'not-an-array'],
            ],
        ];
        $result = ExpressionParser::validateConfig($config);
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
        $result = ExpressionParser::validateConfig($config);
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
        $result = ExpressionParser::validateConfig($config);
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
        $result = ExpressionParser::validateConfig($config);
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
        $result = ExpressionParser::validateConfig($config);
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
        $result = ExpressionParser::validateConfig($config);
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
        $result = ExpressionParser::validateConfig($config);
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
        $result = ExpressionParser::validateConfig($config);
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
        ExpressionParser::validateConfig($config);
        $this->assertSame($original, $config);
    }
}
