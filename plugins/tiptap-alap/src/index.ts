/**
 * Copyright 2026 Daniel Smith
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @alap/tiptap
 *
 * Tiptap/ProseMirror Node extension that registers `<alap-link>` as an
 * inline node. Content authors can insert Alap links in rich-text editors;
 * on publish the node serializes to `<alap-link query="...">text</alap-link>`.
 *
 * Usage:
 *   import { AlapExtension } from '@alap/tiptap';
 *
 *   const editor = new Editor({
 *     extensions: [
 *       StarterKit,
 *       AlapExtension.configure({
 *         HTMLAttributes: { class: 'alap-link' },
 *       }),
 *     ],
 *   });
 */

import { Node, mergeAttributes } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';

export interface AlapExtensionOptions {
  /**
   * HTML attributes added to every rendered `<alap-link>` element.
   * Default: `{}`.
   */
  HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    alapLink: {
      /**
       * Insert an alap-link node around the current selection,
       * or insert a new one with the given text.
       */
      setAlapLink: (attrs: { query: string }) => ReturnType;

      /**
       * Update the query of an existing alap-link node at the current position.
       */
      updateAlapLink: (attrs: { query: string }) => ReturnType;

      /**
       * Remove the alap-link node at the current position,
       * keeping its text content as plain inline text.
       */
      unsetAlapLink: () => ReturnType;
    };
  }
}

export const AlapExtension = Node.create<AlapExtensionOptions>({
  name: 'alapLink',

  group: 'inline',
  inline: true,
  content: 'inline*',

  atom: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      query: {
        default: '',
        parseHTML: (element) => element.getAttribute('query') ?? '',
        renderHTML: (attributes) => {
          if (!attributes.query) return {};
          return { query: attributes.query };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'alap-link' },
      { tag: 'alap-link[query]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'alap-link',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setAlapLink:
        (attrs) =>
        ({ commands, state }: CommandProps) => {
          const { from, to, empty } = state.selection;

          if (empty) {
            // No selection — insert a placeholder node
            return commands.insertContent({
              type: this.name,
              attrs,
              content: [{ type: 'text', text: 'link' }],
            });
          }

          // Wrap selection in an alap-link node
          return commands.insertContent({
            type: this.name,
            attrs,
            content: state.doc.textBetween(from, to)
              ? [{ type: 'text', text: state.doc.textBetween(from, to) }]
              : [{ type: 'text', text: 'link' }],
          });
        },

      updateAlapLink:
        (attrs) =>
        ({ commands, state }: CommandProps) => {
          const { $from } = state.selection;

          // Walk up to find the alapLink node
          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === this.name) {
              const pos = $from.before(depth);
              return commands.command(({ tr }) => {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
                return true;
              });
            }
          }
          return false;
        },

      unsetAlapLink:
        () =>
        ({ commands, state }: CommandProps) => {
          const { $from } = state.selection;

          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === this.name) {
              const from = $from.before(depth);
              const to = $from.after(depth);
              return commands.command(({ tr }) => {
                // Replace the node with its text content
                const text = node.textContent;
                if (text) {
                  tr.replaceWith(from, to, state.schema.text(text));
                } else {
                  tr.delete(from, to);
                }
                return true;
              });
            }
          }
          return false;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-a': () => {
        // If already inside an alap-link, open update flow;
        // otherwise prompt to set one. The actual UI (bubble menu)
        // is provided by the consuming application.
        const { $from } = this.editor.state.selection;
        for (let depth = $from.depth; depth > 0; depth--) {
          if ($from.node(depth).type.name === this.name) {
            // Already inside — no-op, let bubble menu handle it
            return true;
          }
        }
        return this.editor.commands.setAlapLink({ query: '' });
      },
    };
  },
});

export default AlapExtension;
