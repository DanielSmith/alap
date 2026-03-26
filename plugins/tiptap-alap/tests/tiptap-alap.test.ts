import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { AlapExtension } from '../src/index';

function createEditor(content = '<p>hello world</p>') {
  return new Editor({
    element: document.createElement('div'),
    extensions: [StarterKit, AlapExtension],
    content,
  });
}

describe('AlapExtension', () => {
  describe('schema', () => {
    it('registers the alapLink node type', () => {
      const editor = createEditor();
      expect(editor.schema.nodes.alapLink).toBeDefined();
      editor.destroy();
    });

    it('alapLink node is inline', () => {
      const editor = createEditor();
      expect(editor.schema.nodes.alapLink.isInline).toBe(true);
      editor.destroy();
    });
  });

  describe('parseHTML', () => {
    it('parses <alap-link> elements from HTML', () => {
      const editor = createEditor(
        '<p>Try <alap-link query=".coffee">coffee spots</alap-link> nearby</p>',
      );
      const json = editor.getJSON();
      const paragraph = json.content?.[0];
      const alapNode = paragraph?.content?.find(
        (n: any) => n.type === 'alapLink',
      );
      expect(alapNode).toBeDefined();
      expect(alapNode?.attrs?.query).toBe('.coffee');
      expect(alapNode?.content?.[0]?.text).toBe('coffee spots');
      editor.destroy();
    });

    it('parses alap-link without query attr (defaults to empty)', () => {
      const editor = createEditor(
        '<p><alap-link>no query</alap-link></p>',
      );
      const json = editor.getJSON();
      const paragraph = json.content?.[0];
      const alapNode = paragraph?.content?.find(
        (n: any) => n.type === 'alapLink',
      );
      expect(alapNode).toBeDefined();
      expect(alapNode?.attrs?.query).toBe('');
      editor.destroy();
    });
  });

  describe('renderHTML', () => {
    it('serializes to <alap-link> with query attribute', () => {
      const editor = createEditor(
        '<p>Try <alap-link query=".nyc + .bridge">bridges</alap-link></p>',
      );
      const html = editor.getHTML();
      expect(html).toContain('<alap-link');
      expect(html).toContain('query=".nyc + .bridge"');
      expect(html).toContain('bridges');
      expect(html).toContain('</alap-link>');
      editor.destroy();
    });
  });

  describe('commands', () => {
    it('setAlapLink inserts a node with empty selection', () => {
      const editor = createEditor('<p>hello</p>');
      editor.commands.setAlapLink({ query: '.coffee' });
      const html = editor.getHTML();
      expect(html).toContain('<alap-link');
      expect(html).toContain('query=".coffee"');
      editor.destroy();
    });

    it('setAlapLink wraps selected text', () => {
      const editor = createEditor('<p>hello world</p>');
      // Select "world" (positions 7-12 in ProseMirror: 1 for <p> open + 6 chars)
      editor.commands.setTextSelection({ from: 7, to: 12 });
      editor.commands.setAlapLink({ query: '.greeting' });
      const html = editor.getHTML();
      expect(html).toContain('query=".greeting"');
      expect(html).toContain('world');
      editor.destroy();
    });

    it('updateAlapLink changes the query of an existing node', () => {
      const editor = createEditor(
        '<p><alap-link query=".old">text</alap-link></p>',
      );
      // Place cursor inside the alap-link node
      // Position: <p>(1) <alap-link>(2) t(3)
      editor.commands.setTextSelection(3);
      editor.commands.updateAlapLink({ query: '.new' });
      const html = editor.getHTML();
      expect(html).toContain('query=".new"');
      expect(html).not.toContain('query=".old"');
      editor.destroy();
    });

    it('unsetAlapLink removes the node but keeps the text', () => {
      const editor = createEditor(
        '<p>before <alap-link query=".x">inside</alap-link> after</p>',
      );
      // Place cursor inside the alap-link
      editor.commands.setTextSelection(10);
      editor.commands.unsetAlapLink();
      const html = editor.getHTML();
      expect(html).not.toContain('alap-link');
      expect(html).toContain('inside');
      editor.destroy();
    });
  });

  describe('options', () => {
    it('merges HTMLAttributes into rendered output', () => {
      const editor = new Editor({
        element: document.createElement('div'),
        extensions: [
          StarterKit,
          AlapExtension.configure({
            HTMLAttributes: { class: 'my-alap', 'data-custom': 'yes' },
          }),
        ],
        content: '<p><alap-link query=".test">text</alap-link></p>',
      });
      const html = editor.getHTML();
      expect(html).toContain('class="my-alap"');
      expect(html).toContain('data-custom="yes"');
      editor.destroy();
    });
  });

  describe('round-trip', () => {
    it('parse → serialize preserves query and content', () => {
      const original =
        '<p>Check <alap-link query=".nyc | .sf - .tourist">cities</alap-link> here</p>';
      const editor = createEditor(original);
      const html = editor.getHTML();
      expect(html).toContain('query=".nyc | .sf - .tourist"');
      expect(html).toContain('cities');
      expect(html).toContain('</alap-link>');
      editor.destroy();
    });
  });
});
