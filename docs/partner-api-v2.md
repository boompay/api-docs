---
title: Partner API v2
---

`/partner/v2/` is the second version of the Partner API. It serves every endpoint that `/partner/v1/` serves, with the same method, path, parameters, authentication, rate limits and API key scope. A response from v2 is identical to the same response from v1 except for the changes listed below. `v1` keeps working unchanged; see [Versioning and deprecation](versioning-and-deprecation.md) for how long.

| Version | Base path | BoomScreen specification |
|---|---|---|
| v1 | `/partner/v1/` | [`screening-api-docs/v1/api.json`](https://github.com/boompay/api-docs/blob/main/screening-api-docs/v1/api.json) (also published at `screening-api-docs/api.json`) |
| v2 | `/partner/v2/` | [`screening-api-docs/v2/api.json`](https://github.com/boompay/api-docs/blob/main/screening-api-docs/v2/api.json) |

## Changes from v1

### `owner` on a property is an object

| | v1 | v2 |
|---|---|---|
| Property with an owner | `"owner": "Jane Owner"` | `"owner": {"name": "Jane Owner", "email": "jane@example.com", "phone": "5551234567"}` |
| Property without an owner | `"owner": null` | `"owner": null` |
| Property with only a legacy owner name | `"owner": "Jane Owner"` | `"owner": {"name": "Jane Owner", "email": null, "phone": null}` |

It applies to every response that contains a property:

- `GET /partner/v2/properties` and `GET /partner/v2/properties/{id}`
- `POST /partner/v2/properties` and `PATCH /partner/v2/properties/{id}`
- the property nested in units (`GET /partner/v2/units/{id}`), users and property groups

Request bodies do not change: create and update a property's owner with `owner_name` exactly as in v1.

## What does not change

- Every other endpoint, field and error is the same as in v1.
- Webhook payloads are not versioned. `property_created`, `property_updated` and the other events keep the v1 shape, so `owner` stays a string there.
- Public listing endpoints under `/crm/v1/` are not part of Partner API versioning.

## Moving from v1 to v2

1. Regenerate your client from `screening-api-docs/v2/api.json`, or read `owner.name` wherever you read `owner` today.
2. Change the base path from `/partner/v1/` to `/partner/v2/`, starting with `authenticate`. Try it on `api.sandbox.boompay.app` first.
3. Keep handling webhook payloads as before.
