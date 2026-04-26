# Security policy

> **A note on scope.** I'm not a security expert. Alap hasn't been
> through a third-party audit — it's an open source project from a
> single maintainer. Please do your own due diligence before
> deploying, especially when configuring protocols that fetch
> external data or talk to local services. I'm not responsible for
> how you deploy this.

## Reporting a vulnerability

If you think you've found a security issue in Alap, please report it
privately. Don't open a public GitHub issue — give me a chance to get
a fix out before the details circulate.

- Email **security at alap with a tld of info** (or the project maintainer directly).
- A short description and a way to reproduce it locally is plenty.
- Acknowledgement within 72 hours; coordinated disclosure timeline
  agreed with the reporter.

## What's in scope

- The published packages — `alap`, the framework adapters, and the
  language ports under the same namespace.
- The example sites under `examples/sites/` only insofar as a default
  configuration of a published adapter is the actual issue. Demo
  content itself isn't in scope.

What's not in scope: third-party services Alap fetches from (`:web:`,
`:atproto:`, `:hn:`, etc.), the host page's CSP / HTTPS / storage
configuration, and reports that depend on a non-default configuration
the integrator opted into deliberately.

## Supported versions

| Version | Status |
|---|---|
| 3.2.x | Supported — security fixes |
| 3.1.x | Unsupported as of 3.2 — please upgrade |
| 3.0.x | Unsupported as of 3.2 — please upgrade |

3.0 and 3.1 are unsupported as of the 3.2 release. The security work
in 3.2 isn't practically backportable to the earlier versions, and
adoption was low enough that I'd rather direct effort forward than
maintain parallel surfaces. Upgrade to 3.2.

## What to expect from a report

- I'll confirm receipt and what I understand the issue to be.
- If the report leads to a fix, the changelog entry credits the
  reporter (unless they prefer not to be named) and references a CVE
  if one was assigned.
- If the report is out of scope or already covered by an existing
  defense, I'll explain why.

## See also

- [Threat model](docs/security/threat-model.md) — orientation on what
  the library does, doesn't do, and assumes from integrators.
- [Security reference](docs/api-reference/security.md) — full
  per-feature breakdown.
