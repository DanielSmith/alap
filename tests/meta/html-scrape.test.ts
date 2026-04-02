import { describe, it, expect } from 'vitest';
import { scrapeRaw } from '../../editors/shared/meta/html-scrape';

describe('scrapeRaw', () => {
  // --- Titles ---

  describe('titles', () => {
    it('extracts <title> tag', () => {
      const raw = scrapeRaw('<html><head><title>Hello World</title></head></html>');
      expect(raw.title_tag).toBe('Hello World');
    });

    it('extracts og:title from property attribute', () => {
      const raw = scrapeRaw('<meta property="og:title" content="OG Title">');
      expect(raw.og_title).toBe('OG Title');
    });

    it('extracts og:title from name attribute (CNN-style)', () => {
      const raw = scrapeRaw('<meta name="og:title" content="CNN Title">');
      expect(raw.og_title).toBe('CNN Title');
    });

    it('extracts twitter:title', () => {
      const raw = scrapeRaw('<meta name="twitter:title" content="Tweet Title">');
      expect(raw.twitter_title).toBe('Tweet Title');
    });

    it('handles reversed attribute order (content before property)', () => {
      const raw = scrapeRaw('<meta content="Reversed" property="og:title">');
      expect(raw.og_title).toBe('Reversed');
    });
  });

  // --- Descriptions ---

  describe('descriptions', () => {
    it('extracts meta description', () => {
      const raw = scrapeRaw('<meta name="description" content="Page summary">');
      expect(raw.meta_description).toBe('Page summary');
    });

    it('extracts og:description', () => {
      const raw = scrapeRaw('<meta property="og:description" content="OG summary">');
      expect(raw.og_description).toBe('OG summary');
    });

    it('extracts twitter:description', () => {
      const raw = scrapeRaw('<meta name="twitter:description" content="Tweet summary">');
      expect(raw.twitter_description).toBe('Tweet summary');
    });
  });

  // --- Site / type / locale ---

  describe('site metadata', () => {
    it('extracts og:site_name', () => {
      const raw = scrapeRaw('<meta property="og:site_name" content="My Site">');
      expect(raw.og_site_name).toBe('My Site');
    });

    it('extracts og:type', () => {
      const raw = scrapeRaw('<meta property="og:type" content="article">');
      expect(raw.og_type).toBe('article');
    });

    it('extracts og:locale', () => {
      const raw = scrapeRaw('<meta property="og:locale" content="en_US">');
      expect(raw.og_locale).toBe('en_US');
    });

    it('extracts meta-section', () => {
      const raw = scrapeRaw('<meta name="meta-section" content="politics">');
      expect(raw.meta_section).toBe('politics');
    });
  });

  // --- Canonical URL ---

  describe('canonical URL', () => {
    it('extracts canonical link', () => {
      const raw = scrapeRaw('<link rel="canonical" href="https://example.com/canonical">');
      expect(raw.canonical_url).toBe('https://example.com/canonical');
    });

    it('handles reversed attribute order', () => {
      const raw = scrapeRaw('<link href="https://example.com/canonical" rel="canonical">');
      expect(raw.canonical_url).toBe('https://example.com/canonical');
    });
  });

  // --- Keywords ---

  describe('keywords', () => {
    it('extracts and splits keywords', () => {
      const raw = scrapeRaw('<meta name="keywords" content="javascript, web, programming">');
      expect(raw.meta_keywords).toEqual(['javascript', 'web', 'programming']);
    });

    it('filters empty keyword segments', () => {
      const raw = scrapeRaw('<meta name="keywords" content="one,,two, ,three">');
      expect(raw.meta_keywords).toEqual(['one', 'two', 'three']);
    });
  });

  // --- Article tags ---

  describe('article tags', () => {
    it('extracts multiple article:tag values', () => {
      const html = `
        <meta property="article:tag" content="javascript">
        <meta property="article:tag" content="web dev">
        <meta property="article:tag" content="tutorial">
      `;
      const raw = scrapeRaw(html);
      expect(raw.article_tags).toEqual(['javascript', 'web dev', 'tutorial']);
    });

    it('handles reversed attribute order', () => {
      const html = '<meta content="reversed-tag" property="article:tag">';
      const raw = scrapeRaw(html);
      expect(raw.article_tags).toContain('reversed-tag');
    });
  });

  // --- Authors ---

  describe('authors', () => {
    it('extracts article:author', () => {
      const raw = scrapeRaw('<meta property="article:author" content="Jane Doe">');
      expect(raw.article_author).toBe('Jane Doe');
    });

    it('extracts meta author', () => {
      const raw = scrapeRaw('<meta name="author" content="John Smith">');
      expect(raw.meta_author).toBe('John Smith');
    });
  });

  // --- Dates ---

  describe('dates', () => {
    it('extracts article:published_time', () => {
      const raw = scrapeRaw('<meta property="article:published_time" content="2026-03-15T10:00:00Z">');
      expect(raw.article_published_time).toBe('2026-03-15T10:00:00Z');
    });

    it('extracts article:modified_time', () => {
      const raw = scrapeRaw('<meta property="article:modified_time" content="2026-03-16T12:00:00Z">');
      expect(raw.article_modified_time).toBe('2026-03-16T12:00:00Z');
    });

    it('extracts date meta tag', () => {
      const raw = scrapeRaw('<meta name="date" content="2026-03-15">');
      expect(raw.date).toBe('2026-03-15');
    });

    it('extracts Dublin Core date', () => {
      const raw = scrapeRaw('<meta name="dc.date" content="2026-03-15">');
      expect(raw.dc_date).toBe('2026-03-15');
    });

    it('extracts dcterms.modified', () => {
      const raw = scrapeRaw('<meta name="dcterms.modified" content="2026-03-16">');
      expect(raw.dcterms_modified).toBe('2026-03-16');
    });
  });

  // --- Images ---

  describe('images', () => {
    it('extracts og:image', () => {
      const raw = scrapeRaw('<meta property="og:image" content="https://example.com/img.jpg">');
      expect(raw.og_images).toEqual(['https://example.com/img.jpg']);
    });

    it('extracts multiple og:image values', () => {
      const html = `
        <meta property="og:image" content="https://example.com/1.jpg">
        <meta property="og:image" content="https://example.com/2.jpg">
      `;
      const raw = scrapeRaw(html);
      expect(raw.og_images).toEqual([
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
      ]);
    });

    it('extracts og:image from name attribute (CNN-style)', () => {
      const raw = scrapeRaw('<meta name="og:image" content="https://example.com/cnn.jpg">');
      expect(raw.og_images).toContain('https://example.com/cnn.jpg');
    });

    it('extracts twitter:image', () => {
      const raw = scrapeRaw('<meta name="twitter:image" content="https://example.com/tw.jpg">');
      expect(raw.twitter_image).toBe('https://example.com/tw.jpg');
    });

    it('extracts twitter:card', () => {
      const raw = scrapeRaw('<meta name="twitter:card" content="summary_large_image">');
      expect(raw.twitter_card).toBe('summary_large_image');
    });
  });

  // --- Geo ---

  describe('geo', () => {
    it('extracts place:location:latitude', () => {
      const raw = scrapeRaw('<meta property="place:location:latitude" content="40.7128">');
      expect(raw.place_latitude).toBe('40.7128');
    });

    it('extracts place:location:longitude', () => {
      const raw = scrapeRaw('<meta property="place:location:longitude" content="-74.0060">');
      expect(raw.place_longitude).toBe('-74.0060');
    });

    it('extracts geo.position', () => {
      const raw = scrapeRaw('<meta name="geo.position" content="40.7128;-74.0060">');
      expect(raw.geo_position).toBe('40.7128;-74.0060');
    });

    it('extracts ICBM', () => {
      const raw = scrapeRaw('<meta name="ICBM" content="40.7128, -74.0060">');
      expect(raw.icbm).toBe('40.7128, -74.0060');
    });

    it('extracts geo.placename', () => {
      const raw = scrapeRaw('<meta name="geo.placename" content="New York City">');
      expect(raw.geo_placename).toBe('New York City');
    });

    it('extracts geo.region', () => {
      const raw = scrapeRaw('<meta name="geo.region" content="US-NY">');
      expect(raw.geo_region).toBe('US-NY');
    });
  });

  // --- Security ---

  describe('security', () => {
    it('drops values with script tags', () => {
      const raw = scrapeRaw('<meta property="og:title" content="<script>alert(1)</script>">');
      expect(raw.og_title).toBeUndefined();
    });

    it('drops values with javascript: URIs', () => {
      const raw = scrapeRaw('<meta property="og:title" content="javascript:void(0)">');
      expect(raw.og_title).toBeUndefined();
    });

    it('drops values with event handlers', () => {
      const raw = scrapeRaw('<meta property="og:title" content="hello onerror=alert(1)">');
      expect(raw.og_title).toBeUndefined();
    });

    it('drops values with data:text/html', () => {
      const raw = scrapeRaw('<meta property="og:image" content="data:text/html,<h1>xss</h1>">');
      expect(raw.og_images).toBeUndefined();
    });

    it('filters unsafe values from arrays while keeping safe ones', () => {
      const html = `
        <meta property="article:tag" content="good_tag">
        <meta property="article:tag" content="<script>bad</script>">
        <meta property="article:tag" content="another_good">
      `;
      const raw = scrapeRaw(html);
      expect(raw.article_tags).toEqual(['good_tag', 'another_good']);
    });
  });

  // --- HTML entity decoding ---

  describe('entity decoding', () => {
    it('decodes &amp;', () => {
      const raw = scrapeRaw('<meta property="og:title" content="Tom &amp; Jerry">');
      expect(raw.og_title).toBe('Tom & Jerry');
    });

    it('decodes &lt; and &gt;', () => {
      const raw = scrapeRaw('<meta property="og:title" content="1 &lt; 2 &gt; 0">');
      expect(raw.og_title).toBe('1 < 2 > 0');
    });

    it('decodes &quot;', () => {
      const raw = scrapeRaw("<meta property='og:title' content='She said &quot;hello&quot;'>");
      expect(raw.og_title).toBe('She said "hello"');
    });

    it('decodes &#039; and variants', () => {
      const raw = scrapeRaw('<meta property="og:title" content="it&#039;s a test">');
      expect(raw.og_title).toBe("it's a test");
    });

    it('decodes &mdash; to em dash', () => {
      const raw = scrapeRaw('<meta property="og:title" content="Rust and Go &mdash; Bitfield">');
      expect(raw.og_title).toBe('Rust and Go \u2014 Bitfield');
    });

    it('decodes &#8212; (decimal em dash)', () => {
      const raw = scrapeRaw('<meta property="og:title" content="Hello &#8212; World">');
      expect(raw.og_title).toBe('Hello \u2014 World');
    });

    it('decodes &#064; to @ (Threads-style encoding)', () => {
      const raw = scrapeRaw('<meta property="og:title" content="deadmau5 (&#064;deadmau5) on Threads">');
      expect(raw.og_title).toBe('deadmau5 (@deadmau5) on Threads');
    });

    it('decodes &lsquo; and &rsquo; (smart quotes)', () => {
      const raw = scrapeRaw("<meta property='og:title' content='it&rsquo;s a &lsquo;test&rsquo;'>");
      expect(raw.og_title).toBe('it\u2019s a \u2018test\u2019');
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('handles empty HTML', () => {
      const raw = scrapeRaw('');
      expect(Object.keys(raw)).toHaveLength(0);
    });

    it('handles HTML with no meta tags', () => {
      const raw = scrapeRaw('<html><head><title>Just a title</title></head><body>Hello</body></html>');
      expect(raw.title_tag).toBe('Just a title');
      expect(raw.og_title).toBeUndefined();
    });

    it('handles multiline title tag', () => {
      const raw = scrapeRaw('<title>\n  Multi\n  Line\n  Title\n</title>');
      expect(raw.title_tag).toBe('Multi\n  Line\n  Title');
    });

    it('strips nulls from output', () => {
      const raw = scrapeRaw('<html></html>');
      for (const val of Object.values(raw)) {
        expect(val).not.toBeNull();
        expect(val).not.toBeUndefined();
      }
    });
  });
});
