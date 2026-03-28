# Alap — MDX Example

Demonstrates both ways to use Alap in MDX:

1. **Markdown syntax** — `[text](alap:query)` transformed by `remarkAlapMDX`
2. **JSX syntax** — `<AlapLink query="...">` used directly in MDX

## Run

```bash
./serve.sh
# or
npx vite --port 9060
```

Opens at http://localhost:9060

## How it works

- `vite.config.ts` — wires `@mdx-js/rollup` with `remarkAlapMDX` as a remark plugin
- `App.tsx` — wraps MDX content with `AlapProvider` and passes `{ AlapLink }` as the MDX component map
- `content.mdx` — the actual MDX content mixing markdown alap links and JSX components
- `config.ts` — Alap config with links, tags, and macros
