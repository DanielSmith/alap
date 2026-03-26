# Images and Media

**[Cookbook](README.md):** [Language Ports](language-ports.md) · [Editors](editors.md) · [Markdown](markdown.md) · [Accessibility](accessibility.md) · [Existing URLs](existing-urls.md) · **This Page** | [All docs](../README.md)

Alap menu items can display images instead of text, show thumbnails on hover, and carry rich metadata for custom interactions.

> Live version: https://alap.info/cookbook/images-and-media

## Image items

Set the `image` field on a link to render an image instead of text in the menu:

```typescript
allLinks: {
  golden_gate: {
    url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
    image: 'https://example.com/golden-gate.jpg',
    altText: 'Golden Gate Bridge at sunset',
    tags: ['bridge', 'sf'],
  },
}
```

The menu renders `<img src="..." alt="...">` inside the `<a>` element instead of a text label. Both `label` and `image` can be set — `image` takes priority in the menu, but `label` is still available to search patterns and hooks.

### Styling image items

**Web component:**
```css
alap-link {
  --alap-img-max-height: 4rem;
  --alap-img-radius: 3px;
}

/* Or via ::part() for more control */
alap-link::part(image) {
  object-fit: cover;
  width: 100%;
}
```

**DOM adapter:**
```css
#alapelem img {
  max-height: 4rem;
  border-radius: 3px;
  object-fit: cover;
}
```

## Thumbnails (hover previews)

The `thumbnail` field carries a preview image URL that is **not** rendered in the menu. It's available to event handlers for building custom hover previews:

```typescript
allLinks: {
  golden_gate: {
    url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
    label: 'Golden Gate Bridge',
    thumbnail: 'https://example.com/golden-gate-thumb.jpg',
    description: 'Iconic suspension bridge spanning the Golden Gate strait',
    tags: ['bridge', 'sf'],
    hooks: ['item-hover'],
  },
}
```

### Building a hover preview

**React:**
```tsx
function PreviewLink({ query, children }) {
  const [preview, setPreview] = useState(null);

  return (
    <>
      <AlapLink
        query={query}
        onItemHover={({ link }) => setPreview(link)}
      >
        {children}
      </AlapLink>
      {preview && (
        <div className="preview-card">
          <img src={preview.thumbnail} alt="" />
          <p>{preview.description}</p>
        </div>
      )}
    </>
  );
}
```

**Vanilla DOM:**
```typescript
const preview = document.getElementById('preview');

const ui = new AlapUI(config, {
  onItemHover: ({ link }) => {
    if (link.thumbnail) {
      preview.innerHTML = `
        <img src="${link.thumbnail}" alt="" />
        <p>${link.description}</p>
      `;
      preview.hidden = false;
    }
  },
});
```

**Web component (event listener):**
```javascript
document.addEventListener('alap:item-hover', (e) => {
  const { link } = e.detail;
  if (link.thumbnail) {
    showPreview(link.thumbnail, link.description);
  }
});
```

## Context menus

Use `item-context` hooks to build right-click or ArrowRight interactions:

```typescript
allLinks: {
  golden_gate: {
    url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge',
    label: 'Golden Gate Bridge',
    thumbnail: 'https://example.com/golden-gate-large.jpg',
    description: 'Iconic suspension bridge...',
    hooks: ['item-hover', 'item-context'],
    meta: { location: [37.8199, -122.4783] },
  },
}
```

```typescript
onItemContext: ({ link, event }) => {
  event.preventDefault();
  showContextPopup({
    x: event.pageX,
    y: event.pageY,
    title: link.label,
    image: link.thumbnail,
    description: link.description,
    mapUrl: `https://maps.google.com/?q=${link.meta.location.join(',')}`,
  });
}
```

## The `meta` field

The `meta` field is a bag of arbitrary key-value pairs. It's not rendered by any adapter — it's available to protocol handlers, event hooks, and custom code:

```typescript
allLinks: {
  devocion: {
    url: 'https://www.devocion.com',
    label: 'Devocion',
    tags: ['coffee', 'nyc'],
    meta: {
      location: [40.6892, -73.9838],
      price: 5,
      rating: 4.8,
      hours: '7am-7pm',
    },
  },
}
```

Protocol expressions read from `meta` (e.g., `:price:0:10:` checks `meta.price`). Event handlers can display any `meta` field in custom UI. The shape is yours to define.
