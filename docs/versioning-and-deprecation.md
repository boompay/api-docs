---
title: Versioning and deprecation policy
---

The Partner API is versioned in the path: every endpoint lives under `/partner/v1/` and `/partner/v2/` (screening, rent reporting, CRM), and public listing pages under `/crm/v1/`. The version number changes only for breaking changes.

| Version | Status | What changed |
|---|---|---|
| `v2` | Current | [Partner API v2](partner-api-v2.md): `owner` on a property is an object |
| `v1` | Supported | First version |

The BoomScreen specification is published per version (`screening-api-docs/v1/api.json`, `screening-api-docs/v2/api.json`). Within a version a specification only grows; our CI rejects any change to a published version that would break a generated client.

## What we may change without notice (non-breaking)

Your integration must tolerate all of the following at any time:

- New endpoints.
- New **optional** request parameters and body fields.
- New fields in any response object, including nested objects and list items.
- New values for string fields that act as enumerations (statuses, event types, error codes, document types). Handle an unknown value by falling back to a safe default rather than failing.
- New webhook event types. Ignore events you do not subscribe to or recognise.
- Changes to the wording of human-readable `message` strings.
- Changes to the order of keys in JSON objects and to whitespace.
- Additional response headers.

## What we treat as breaking

These ship only under the next path version (for example `/partner/v3/`), never inside an existing version:

- Removing or renaming an endpoint, request parameter, response field, or webhook event.
- Changing the type or format of a field (for example a number becoming a string, or a date becoming a timestamp).
- Making an optional parameter required, or tightening validation so that previously accepted requests fail.
- Removing a value from an enumeration.
- Changing authentication or authorization semantics.
- Changing the meaning of an existing error code or status.

## How deprecation works

When a field, parameter, endpoint or webhook event is superseded inside `v1`:

1. It is marked `deprecated: true` in the OpenAPI specifications and labelled "(Deprecated)" in the documentation, with a pointer to its replacement.
2. The deprecation is announced in the product changelog at <https://www.boompay.app/product-updates>, tagged **API**, and partners with active API keys are emailed.
3. It keeps working unchanged for **at least six months** from the announcement. Removal, if it happens at all, is a breaking change and therefore lands only in a new path version.

## How a new version is introduced

1. Partners with active API keys are told about the new version, and what differs, **at least two weeks** before it reaches production.
2. The new version reaches the sandbox (`api.sandbox.boompay.app`) before production.
3. The previous version keeps working unchanged for **at least six months** after the new version reaches production, counted from the day partners were told. Its retirement is announced like any other deprecation.

Currently deprecated in `v1`:

| Item | Replacement |
|---|---|
| `monthly_rent_amount` (float) on enrollments | `monthly_rent` (`{cents, currency}`) |
| `last_page` on `GET /partner/v1/applications` | `has_more` |
| `page` / `per_page` on `GET /partner/v1/leads/activity_logs` | `cursor` / `limit` (see [cursor pagination](pagination.md#cursor-pagination)) |
| Webhook events labelled "(Deprecated)" on the Webhooks page | The successor event named alongside each one |

## Where changes are published

- **Changelog:** <https://www.boompay.app/product-updates> — weekly, tagged by product; API changes are called out explicitly.
- **Specifications:** <https://github.com/boompay/api-docs> — every change to the OpenAPI files is a dated commit.
- **Status page:** <https://boompay.statuspage.io> — incidents and scheduled maintenance.

## Writing a resilient client

- Ignore unknown fields and unknown enum values.
- Branch on `code`, never on `message`.
- Generate clients from the OpenAPI specifications and regenerate when the changelog announces an API change.
- Send an `X-Request-Id` and log it; see [Errors and request IDs](errors.md).
