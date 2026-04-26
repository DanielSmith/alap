<?php

// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

/**
 * Tests for the PHP expression parser — mirrors the TS test tiers.
 */

use Alap\ExpressionParser;
use PHPUnit\Framework\TestCase;

class ExpressionParserTest extends TestCase
{
    private static array $config;
    private ExpressionParser $parser;

    public static function setUpBeforeClass(): void
    {
        self::$config = [
            'settings' => ['listType' => 'ul', 'menuTimeout' => 5000],
            'macros' => [
                'cars' => ['linkItems' => 'vwbug, bmwe36'],
                'nycbridges' => ['linkItems' => '.nyc + .bridge'],
                'everything' => ['linkItems' => '.nyc | .sf'],
            ],
            'searchPatterns' => [
                'bridges' => 'bridge',
                'germanCars' => [
                    'pattern' => 'VW|BMW',
                    'options' => ['fields' => 'l', 'limit' => 5],
                ],
            ],
            'allLinks' => [
                'vwbug' => ['label' => 'VW Bug', 'url' => 'https://example.com/vwbug', 'tags' => ['car', 'vw', 'germany']],
                'bmwe36' => ['label' => 'BMW E36', 'url' => 'https://example.com/bmwe36', 'tags' => ['car', 'bmw', 'germany']],
                'miata' => ['label' => 'Mazda Miata', 'url' => 'https://example.com/miata', 'tags' => ['car', 'mazda', 'japan']],
                'brooklyn' => ['label' => 'Brooklyn Bridge', 'url' => 'https://example.com/brooklyn', 'tags' => ['nyc', 'bridge', 'landmark']],
                'manhattan' => ['label' => 'Manhattan Bridge', 'url' => 'https://example.com/manhattan', 'tags' => ['nyc', 'bridge']],
                'highline' => ['label' => 'The High Line', 'url' => 'https://example.com/highline', 'tags' => ['nyc', 'park', 'landmark']],
                'centralpark' => ['label' => 'Central Park', 'url' => 'https://example.com/centralpark', 'tags' => ['nyc', 'park']],
                'goldengate' => ['label' => 'Golden Gate', 'url' => 'https://example.com/goldengate', 'tags' => ['sf', 'bridge', 'landmark']],
                'dolores' => ['label' => 'Dolores Park', 'url' => 'https://example.com/dolores', 'tags' => ['sf', 'park']],
                'towerbridge' => ['label' => 'Tower Bridge', 'url' => 'https://example.com/towerbridge', 'tags' => ['london', 'bridge', 'landmark']],
                'aqus' => ['label' => 'Aqus Cafe', 'url' => 'https://example.com/aqus', 'tags' => ['coffee', 'sf']],
                'bluebottle' => ['label' => 'Blue Bottle', 'url' => 'https://example.com/bluebottle', 'tags' => ['coffee', 'sf', 'nyc']],
                'acre' => ['label' => 'Acre Coffee', 'url' => 'https://example.com/acre', 'tags' => ['coffee']],
            ],
        ];
    }

    protected function setUp(): void
    {
        $this->parser = new ExpressionParser(self::$config);
    }

    // --- Tier 1: Operands ---

    public function testSingleItemId(): void
    {
        $this->assertSame(['vwbug'], $this->parser->query('vwbug'));
    }

    public function testSingleClass(): void
    {
        $result = $this->parser->query('.car');
        sort($result);
        $this->assertSame(['bmwe36', 'miata', 'vwbug'], $result);
    }

    public function testNonexistentItem(): void
    {
        $this->assertSame([], $this->parser->query('doesnotexist'));
    }

    public function testNonexistentClass(): void
    {
        $this->assertSame([], $this->parser->query('.doesnotexist'));
    }

    // --- Tier 2: Commas ---

    public function testTwoItems(): void
    {
        $this->assertSame(['vwbug', 'bmwe36'], $this->parser->query('vwbug, bmwe36'));
    }

    public function testThreeItems(): void
    {
        $this->assertSame(['vwbug', 'bmwe36', 'miata'], $this->parser->query('vwbug, bmwe36, miata'));
    }

    public function testDeduplication(): void
    {
        $this->assertSame(['vwbug'], $this->parser->query('vwbug, vwbug'));
    }

    // --- Tier 3: Operators ---

    public function testIntersection(): void
    {
        $result = $this->parser->query('.nyc + .bridge');
        sort($result);
        $this->assertSame(['brooklyn', 'manhattan'], $result);
    }

    public function testUnion(): void
    {
        $result = $this->parser->query('.nyc | .sf');
        $this->assertContains('brooklyn', $result);
        $this->assertContains('goldengate', $result);
    }

    public function testSubtraction(): void
    {
        $result = $this->parser->query('.nyc - .bridge');
        $this->assertNotContains('brooklyn', $result);
        $this->assertNotContains('manhattan', $result);
        $this->assertContains('highline', $result);
        $this->assertContains('centralpark', $result);
    }

    // --- Tier 4: Chained ---

    public function testThreeWayIntersection(): void
    {
        $this->assertSame(['brooklyn'], $this->parser->query('.nyc + .bridge + .landmark'));
    }

    public function testUnionThenSubtract(): void
    {
        $result = $this->parser->query('.nyc | .sf - .bridge');
        $this->assertNotContains('brooklyn', $result);
        $this->assertNotContains('goldengate', $result);
        $this->assertContains('highline', $result);
    }

    // --- Tier 6: Macros ---

    public function testNamedMacro(): void
    {
        $result = $this->parser->query('@cars');
        sort($result);
        $this->assertSame(['bmwe36', 'vwbug'], $result);
    }

    public function testMacroWithOperators(): void
    {
        $result = $this->parser->query('@nycbridges');
        sort($result);
        $this->assertSame(['brooklyn', 'manhattan'], $result);
    }

    public function testUnknownMacro(): void
    {
        $this->assertSame([], $this->parser->query('@nonexistent'));
    }

    // --- Tier 7: Parentheses ---

    public function testBasicGrouping(): void
    {
        $result = $this->parser->query('.nyc | (.sf + .bridge)');
        $this->assertContains('highline', $result);
        $this->assertContains('centralpark', $result);
        $this->assertContains('goldengate', $result);
    }

    public function testNestedParens(): void
    {
        $result = $this->parser->query('((.nyc + .bridge) | (.sf + .bridge))');
        sort($result);
        $this->assertSame(['brooklyn', 'goldengate', 'manhattan'], $result);
    }

    public function testParensWithSubtraction(): void
    {
        $result = $this->parser->query('(.nyc | .sf) - .park');
        $this->assertNotContains('centralpark', $result);
        $this->assertNotContains('dolores', $result);
        $this->assertContains('brooklyn', $result);
    }

    // --- Tier 8: Edge cases ---

    public function testEmptyString(): void
    {
        $this->assertSame([], $this->parser->query(''));
    }

    public function testWhitespaceOnly(): void
    {
        $this->assertSame([], $this->parser->query('   '));
    }

    public function testEmptyConfig(): void
    {
        $p = new ExpressionParser(['allLinks' => []]);
        $this->assertSame([], $p->query('.car'));
    }

    public function testNoAllLinks(): void
    {
        $p = new ExpressionParser([]);
        $this->assertSame([], $p->query('vwbug'));
    }

    // --- Convenience methods ---

    public function testCherryPick(): void
    {
        $result = ExpressionParser::cherryPick(self::$config, 'vwbug, miata');
        $this->assertArrayHasKey('vwbug', $result);
        $this->assertArrayHasKey('miata', $result);
        $this->assertArrayNotHasKey('bmwe36', $result);
    }

    public function testResolve(): void
    {
        $results = ExpressionParser::resolve(self::$config, '.car + .germany');
        $ids = array_column($results, 'id');
        sort($ids);
        $this->assertSame(['bmwe36', 'vwbug'], $ids);
    }

    public function testMergeConfigs(): void
    {
        $c1 = ['allLinks' => ['a' => ['label' => 'A', 'url' => 'https://a.com']]];
        $c2 = ['allLinks' => ['b' => ['label' => 'B', 'url' => 'https://b.com']]];
        $merged = ExpressionParser::mergeConfigs($c1, $c2);
        $this->assertArrayHasKey('a', $merged['allLinks']);
        $this->assertArrayHasKey('b', $merged['allLinks']);
    }

    public function testMergeConfigsLaterWins(): void
    {
        $c1 = ['allLinks' => ['a' => ['label' => 'Old', 'url' => 'https://old.com']]];
        $c2 = ['allLinks' => ['a' => ['label' => 'New', 'url' => 'https://new.com']]];
        $merged = ExpressionParser::mergeConfigs($c1, $c2);
        $this->assertSame('New', $merged['allLinks']['a']['label']);
    }

    // --- URL sanitization ---

    public function testSanitizeUrlSafe(): void
    {
        $this->assertSame('https://example.com', ExpressionParser::sanitizeUrl('https://example.com'));
        $this->assertSame('/relative/path', ExpressionParser::sanitizeUrl('/relative/path'));
        $this->assertSame('', ExpressionParser::sanitizeUrl(''));
    }

    public function testSanitizeUrlJavascript(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl('javascript:alert(1)'));
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl('JAVASCRIPT:alert(1)'));
    }

    public function testSanitizeUrlData(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl('data:text/html,<h1>Hi</h1>'));
    }

    public function testSanitizeUrlVbscript(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl('vbscript:MsgBox'));
    }

    public function testSanitizeUrlBlob(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl('blob:https://example.com/uuid'));
    }

    public function testSanitizeUrlControlChars(): void
    {
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl("java\nscript:alert(1)"));
        $this->assertSame('about:blank', ExpressionParser::sanitizeUrl("java\tscript:alert(1)"));
    }

    public function testSanitizeInResolve(): void
    {
        $config = [
            'allLinks' => [
                'bad' => ['label' => 'Evil', 'url' => 'javascript:alert(1)', 'tags' => ['test']],
                'good' => ['label' => 'Good', 'url' => 'https://example.com', 'tags' => ['test']],
            ],
        ];
        $results = ExpressionParser::resolve($config, '.test');
        $urls = [];
        foreach ($results as $r) {
            $urls[$r['id']] = $r['url'];
        }
        $this->assertSame('about:blank', $urls['bad']);
        $this->assertSame('https://example.com', $urls['good']);
    }

    public function testSanitizeInCherryPick(): void
    {
        $config = [
            'allLinks' => [
                'bad' => ['label' => 'Evil', 'url' => 'javascript:alert(1)', 'tags' => ['test']],
            ],
        ];
        $result = ExpressionParser::cherryPick($config, '.test');
        $this->assertSame('about:blank', $result['bad']['url']);
    }

    // --- Protocol tokenization and resolution ---

    public function testProtocolTokenizationBasic(): void
    {
        $config = [
            'allLinks' => [
                'a' => ['label' => 'A', 'url' => 'https://a.com', 'tags' => ['test'], 'meta' => ['score' => 10]],
                'b' => ['label' => 'B', 'url' => 'https://b.com', 'tags' => ['test'], 'meta' => ['score' => 5]],
                'c' => ['label' => 'C', 'url' => 'https://c.com', 'tags' => ['other'], 'meta' => ['score' => 20]],
            ],
            'protocols' => [
                'highscore' => function (array $args, array $link, string $id): bool {
                    $threshold = (int) ($args[0] ?? 0);
                    return ($link['meta']['score'] ?? 0) >= $threshold;
                },
            ],
        ];
        $parser = new ExpressionParser($config);
        $result = $parser->query(':highscore:8:');
        sort($result);
        $this->assertSame(['a', 'c'], $result);
    }

    public function testProtocolWithNoArgs(): void
    {
        $config = [
            'allLinks' => [
                'x' => ['label' => 'X', 'url' => 'https://x.com', 'tags' => ['featured']],
                'y' => ['label' => 'Y', 'url' => 'https://y.com', 'tags' => []],
            ],
            'protocols' => [
                'featured' => function (array $args, array $link, string $id): bool {
                    return in_array('featured', $link['tags'] ?? [], true);
                },
            ],
        ];
        $parser = new ExpressionParser($config);
        $this->assertSame(['x'], $parser->query(':featured:'));
    }

    public function testProtocolComposedWithTags(): void
    {
        $config = [
            'allLinks' => [
                'a' => ['label' => 'A', 'url' => 'https://a.com', 'tags' => ['nyc'], 'meta' => ['score' => 10]],
                'b' => ['label' => 'B', 'url' => 'https://b.com', 'tags' => ['nyc'], 'meta' => ['score' => 3]],
                'c' => ['label' => 'C', 'url' => 'https://c.com', 'tags' => ['sf'], 'meta' => ['score' => 10]],
            ],
            'protocols' => [
                'highscore' => function (array $args, array $link, string $id): bool {
                    $threshold = (int) ($args[0] ?? 0);
                    return ($link['meta']['score'] ?? 0) >= $threshold;
                },
            ],
        ];
        $parser = new ExpressionParser($config);
        // Protocol intersected with tag
        $result = $parser->query(':highscore:5: + .nyc');
        $this->assertSame(['a'], $result);
    }

    public function testUnknownProtocolReturnsEmpty(): void
    {
        $config = [
            'allLinks' => [
                'a' => ['label' => 'A', 'url' => 'https://a.com', 'tags' => []],
            ],
        ];
        $parser = new ExpressionParser($config);
        $this->assertSame([], $parser->query(':nonexistent:'));
    }

    public function testProtocolHandlerThrowsSkipsItem(): void
    {
        $config = [
            'allLinks' => [
                'good' => ['label' => 'Good', 'url' => 'https://good.com', 'tags' => [], 'meta' => ['val' => 5]],
                'bad' => ['label' => 'Bad', 'url' => 'https://bad.com', 'tags' => []],
            ],
            'protocols' => [
                'risky' => function (array $args, array $link, string $id): bool {
                    if (! isset($link['meta']['val'])) {
                        throw new \RuntimeException('missing val');
                    }
                    return $link['meta']['val'] > 0;
                },
            ],
        ];
        $parser = new ExpressionParser($config);
        // 'bad' throws, should be skipped; 'good' passes
        $this->assertSame(['good'], $parser->query(':risky:'));
    }

    // --- Refiner application ---

    public function testRefinerSortByLabel(): void
    {
        $result = $this->parser->query('.car *sort:label*');
        $this->assertSame(['bmwe36', 'miata', 'vwbug'], $result);
    }

    public function testRefinerSortDefaultIsLabel(): void
    {
        $result = $this->parser->query('.car *sort*');
        $this->assertSame(['bmwe36', 'miata', 'vwbug'], $result);
    }

    public function testRefinerLimit(): void
    {
        $result = $this->parser->query('.car *sort:label* *limit:2*');
        $this->assertSame(['bmwe36', 'miata'], $result);
    }

    public function testRefinerReverse(): void
    {
        $result = $this->parser->query('.car *sort:label* *reverse*');
        $this->assertSame(['vwbug', 'miata', 'bmwe36'], $result);
    }

    public function testRefinerSkip(): void
    {
        $result = $this->parser->query('.car *sort:label* *skip:1*');
        $this->assertSame(['miata', 'vwbug'], $result);
    }

    public function testRefinerUnknownSkipped(): void
    {
        // Unknown refiner is silently skipped — result unchanged
        $result = $this->parser->query('.car *sort:label* *bogus*');
        $this->assertSame(['bmwe36', 'miata', 'vwbug'], $result);
    }

    public function testRefinerShuffle(): void
    {
        // Just verify shuffle returns the same set
        $result = $this->parser->query('.car *shuffle*');
        sort($result);
        $this->assertSame(['bmwe36', 'miata', 'vwbug'], $result);
    }

    public function testRefinerUniqueByField(): void
    {
        // All three cars have unique labels — unique:label keeps all
        $result = $this->parser->query('.car *unique:label*');
        $this->assertCount(3, $result);
    }

    // --- Hyphen is always the WITHOUT operator ---

    public function testHyphenIsTreatedAsWithoutOperator(): void
    {
        // "vw-bug" is parsed as "vw" MINUS "bug", not as the identifier "vw-bug".
        $config = [
            'allLinks' => [
                'vw' => ['label' => 'VW', 'url' => 'https://example.com/vw', 'tags' => ['car']],
                'bug' => ['label' => 'Bug', 'url' => 'https://example.com/bug', 'tags' => ['car']],
            ],
        ];
        $parser = new ExpressionParser($config);
        $this->assertSame(['vw'], $parser->query('vw-bug'));
    }

    public function testUnderscoresInIdentifiers(): void
    {
        $config = [
            'allLinks' => [
                'vw_bug' => ['label' => 'VW Bug', 'url' => 'https://example.com/vw-bug', 'tags' => ['car']],
                'bmw_e36' => ['label' => 'BMW E36', 'url' => 'https://example.com/bmw-e36', 'tags' => ['car']],
            ],
        ];
        $parser = new ExpressionParser($config);
        $result = $parser->query('vw_bug, bmw_e36');
        $this->assertSame(['vw_bug', 'bmw_e36'], $result);
    }

    public function testUnderscoresInClassTags(): void
    {
        $config = [
            'allLinks' => [
                'a' => ['label' => 'A', 'url' => 'https://a.com', 'tags' => ['new_york']],
                'b' => ['label' => 'B', 'url' => 'https://b.com', 'tags' => ['san_francisco']],
            ],
        ];
        $parser = new ExpressionParser($config);
        $this->assertSame(['a'], $parser->query('.new_york'));
    }

    public function testHyphenAsOperatorWithSpaces(): void
    {
        // "foo - .tag" should treat - as MINUS operator
        $result = $this->parser->query('.nyc - .bridge');
        $this->assertNotContains('brooklyn', $result);
        $this->assertContains('highline', $result);
    }
}
