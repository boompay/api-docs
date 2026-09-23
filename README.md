# Boom Partner API specifications

Machine-readable definitions of the Boom Partner API, served from `api.production.boompay.app` and `api.sandbox.boompay.app`.

| File | Covers | Format |
|---|---|---|
| `screening-api-docs/api.json` | BoomScreen (tenant screening) and BoomCRM (leads, listings, magic links) under `/partner/v1/` and `/crm/v1/` | OpenAPI 3.0 |
| `rent-reporting-api-docs/api.json` | BoomReport (customers, enrollments, rental payments, Plaid, ledgers) under `/partner/v1/` | OpenAPI 3.0 |
| `docs/*.md` | Cross-cutting guides: errors and request IDs, pagination and ordering, rate limits, versioning and deprecation | Markdown, published on docs.boompay.app |

Both specifications share the same conventions: bearer JWT auth from `POST /partner/v1/authenticate`, one error envelope, one list envelope, an `X-Request-Id` on every response. The `info.description` of each file summarises them; the `docs/` guides are the long form.

## Source of truth

The API server (`boompay-api`, `app/endpoints/boom/partner_api/`) is the source of truth. These files are maintained by hand and must be updated in the same change as any endpoint, parameter, field or error that a partner can observe. A change to the JSON here without a corresponding deploy, or vice versa, is a documentation bug.

## Publishing

- The documentation site (docs.boompay.app) renders both specifications from the raw GitHub URLs of the files above and hosts the `docs/` guides as pages. After merging, confirm the rendered reference and the AI-readable corpus (`docs.boompay.app/llms-full.txt`) picked up the change.
- Deprecations follow `docs/versioning-and-deprecation.md`: mark `deprecated: true` here, announce in the changelog, keep working for at least six months.

## Validating a change

```sh
npx --yes @redocly/cli lint screening-api-docs/api.json rent-reporting-api-docs/api.json
```

`operationId` values must be unique within a file, every `$ref` must resolve, and every response should declare the `X-Request-Id` header.
