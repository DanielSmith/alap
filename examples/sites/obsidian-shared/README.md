# Obsidian shared content

The vault and the example source flavours that feed it. Both the
`obsidian/` (filesystem mode, `:obsidian:core:`) and `obsidian-rest/`
(REST API mode, `:obsidian:rest:`) sites point at this directory by
default — neither owns the content.

```
obsidian-shared/
├── sources/    # input examples for the markdown→Obsidian converter
└── AlapDocs/   # the converted vault content (committed, regenerable)
```

The vault directory is named `AlapDocs/` deliberately: when you open
it in Obsidian, the app uses the directory name as the vault name by
default, and `obsidian://open?vault=AlapDocs&file=…` URIs emitted by
the example servers point at exactly that name. So clicking a result
in either example site opens the corresponding note in Obsidian
without renaming anything.

## `AlapDocs/`

A combined Obsidian vault assembled from two regen scripts:

- `pnpm -w run vault:docs` — converts the project's own `docs/` tree
  into top-level subdirs (`api-reference/`, `cookbook/`,
  `core-concepts/`, `framework-guides/`, `getting-started/`,
  `integrations/`, `packages/`, `plugins/`, `release-notes/`,
  `security/`).
- `pnpm -w run vault:demo` — converts each flavour under `sources/`
  into a topic subdir (`birds/`, `cooking/`, `films/`, `novels/`,
  `bach/`, `untrusted-strict/`).

The two scripts touch disjoint subdirectories of the vault and don't
overwrite each other's output. Both are idempotent — rerunning
either replays its conversion against the current source.

`.obsidian/` is gitignored — Obsidian creates it on first open and
it's per-user workspace state.

## `sources/`

Six small source flavours used as inputs for the converter demo.
Each is a self-contained example that exercises one SSG plugin (or
the no-plugin baseline). Body content in five of them is adapted
from Wikipedia under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/);
the SSG syntax wrapping it is mine. Photos throughout come from
Wikimedia Commons with mixed licences. Per-flavour details in each
sub-README.

## Pointing each site at this vault

Both example sites' `server.mjs` use this path as their
`DEFAULT_VAULT_PATH`. Override per-run with `ALAP_OBSIDIAN_VAULT` if
you want them to read from a different vault on disk.

The vault *name* (used in `obsidian://open?vault=…&file=…` URIs) is
separately controlled by `ALAP_OBSIDIAN_VAULT_NAME` (default
`AlapDocs`).

## Opening the vault in Obsidian

For clicks on Alap menu results to actually open notes in Obsidian,
the Obsidian app needs to have this vault registered under the same
name the server emits (default: `AlapDocs`).

1. In Obsidian: **File → Open vault → Open folder as vault**.
2. Pick `examples/sites/obsidian-shared/AlapDocs/`.
3. The dialog pre-fills the name from the directory: **AlapDocs**.
   Don't change it. That's the string `obsidian://open?vault=AlapDocs`
   URIs need to match.

If you've previously registered the vault under a different name
(or registered an older path before a rename), Obsidian doesn't
auto-clean stale entries. Open **File → Manage Vaults…**, remove
any stale or wrongly-named registrations, and re-add the folder
fresh.

If you'd rather keep your existing Obsidian vault name and have the
server emit *that* name instead, override:

```bash
ALAP_OBSIDIAN_VAULT_NAME=YourActualVaultName ./serve.sh
```
