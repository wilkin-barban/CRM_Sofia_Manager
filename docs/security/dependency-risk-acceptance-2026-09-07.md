# Dependency risk disposition — 2026-09-07

## Decision

The Category E release removes or patches every npm audit finding rated **high** or **critical**. Two **moderate**, transitive runtime findings are accepted temporarily because their parent packages do not yet publish compatible patched dependency ranges and npm's suggested fixes require replacing the parent APIs.

This acceptance expires on **2026-10-07**. Reassess sooner if `mammoth`, `googleapis`, or `googleapis-common` publishes a compatible release.

## Remediated findings

- Removed the unused direct `pdfjs-dist@3.11.174` dependency. Payment-proof rendering continues through `pdf-parse@2.4.5` and `pdfjs-dist@5.4.296`; the reviewed static viewer assets remain unchanged.
- Removed the legacy `canvas@2` → `@mapbox/node-pre-gyp` → `tar@6.2.1` tree from the lockfile.
- Pinned `browserslist@4.28.9` through the root override.
- Updated `mammoth` to `1.12.2`, the latest compatible parent release available at review time.

## Temporarily accepted findings

| Package path | Severity | Runtime surface | Compensating controls |
|---|---|---|---|
| `mammoth@1.12.2` → `@xmldom/xmldom@0.8.13` | Moderate | Administrative knowledge-document DOCX parsing | Authenticated administrative action; accepted document types and upload limits remain enforced; no change to parsing behavior in this release. |
| `googleapis-common@8.0.2` → `qs@6.15.3` | Moderate | Outbound Google Calendar client request serialization | Server-controlled request objects and fixed Calendar API endpoint; no attacker-controlled query parser endpoint is exposed by this dependency path. |

## Rejected automatic remediation

`npm audit fix` and `npm audit fix --force` were not used. npm's available fixes would cross parent-package and API boundaries without proving compatibility. Direct undeclared transitive replacement was also rejected because it produces an invalid npm dependency tree under the repository's npm version.

## Verification and rollback

Required before merge:

- `npm audit --json`: zero critical/high findings; exactly the two accepted moderate paths above.
- `npm audit --omit=dev --json`: same bounded result.
- Focused PDF render/viewer and Google action tests.
- ESLint, TypeScript, Next.js production build, hermetic Vitest, and service-backed Supabase suites.

Rollback is a revert of the manifest, lockfile, and this disposition document. No database or production state is changed by this work unit.

## Update — 2026-11-08 (release v0.1.0 preflight)

The v0.1.0 release preflight repeated `npm audit` on a clean `npm ci` and found the
disposition above had expired and no longer described the tree: the lockfile reported
**1 critical, 6 high and 11 moderate** findings. The critical finding was the Next.js
RCE advisory (fixed in 16.4.5); high findings also covered `sharp`, `zod`, `undici`
and `vite`.

Remediation applied before release:

- `next` 16.3.3 → **16.4.5**
- `eslint-config-next` 16.3.0 → **16.4.5**
- `sharp` 0.35.4 → **0.35.5**
- `zod` ^4.4.3 → **^4.6.6**
- `npm audit fix` for the transitive `undici`, `vite`, `source-map-js` findings
- lockfile regenerated once, with no other manifest change

Verified results (2026-11-08):

```text
npm audit             -> 0 critical, 0 high, 11 moderate (dev tooling only)
npm audit --omit=dev  -> 0 vulnerabilities (0/0, production dependencies)
```

All remaining findings are moderate and dev-tooling only:

| Path | Surface | Status |
|---|---|---|
| `eslint-config-next` → `typescript-eslint` → `@typescript-eslint/*` → `minimatch` | Lint tooling, not shipped | Accepted; npm's suggested fix is a semver-major downgrade to `eslint-config-next@15.5.29`, rejected |
| `vitest` → `@vitest/mocker`, `@vitest/coverage-v8` | Test tooling, not shipped | Accepted; no runtime exposure |

The two findings accepted on 2026-09-07 (`mammoth` → `@xmldom/xmldom` and
`googleapis-common` → `qs`) no longer appear in `npm audit`; the `xlsx`/`googleapis`
dependencies were retired from the tree.

Production dependencies are clean: `npm audit --omit=dev` reports 0 critical, 0 high
and 0 moderate findings. The original acceptance condition — zero critical and zero
high findings — is met again in the full tree, and the production tree has no
findings at all. The 11 remaining moderate findings stay confined to lint and test
tooling that is never shipped. Lint, type-check, hermetic tests and the production
build are re-run against the updated tree before release.
