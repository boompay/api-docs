---
title: Partner API v2
---

`/partner/v2/` is the second version of the Partner API. It serves every endpoint that `/partner/v1/` serves, with the same method, path, parameters (apart from `include_generic` on the applications GETs), authentication, rate limits and API key scope. A response from v2 is identical to the same response from v1 except for the changes listed below. `v1` keeps working unchanged; see [Versioning and deprecation](versioning-and-deprecation.md) for how long.

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

- `GET /partner/v2/properties`, `GET /partner/v2/properties/{id}`, `POST /partner/v2/properties`, `PATCH /partner/v2/properties/{id}` and `POST /partner/v2/properties/{id}/set_bank_account`
- `GET /partner/v2/units/{id}`, `POST /partner/v2/units` and `PATCH /partner/v2/units/{id}` (`property`)
- `GET /partner/v2/property_groups/{id}` (`properties`)
- `GET /partner/v2/users`, `GET /partner/v2/users/{id}`, `POST /partner/v2/users` and `PATCH /partner/v2/users/{id}` (`properties`)

Request bodies do not change: create and update a property's owner with `owner_name` exactly as in v1.

### Nested properties follow the API key's property scope

With an API key scoped to some properties, the `properties` array of a user (`GET`/`POST /partner/v2/users`, `GET`/`PATCH /partner/v2/users/{id}`) and of a property group (`GET /partner/v2/property_groups/{id}`) lists only the properties in the key's scope. In v1 these arrays list every property of the user or group. Keys without a property scope see every property in both versions.

### Generic applications without a unit, on request

A generic application is started from a generic application option (a pre-approval, for example) before the company sets its unit. v1 never returns one until its unit is set. In v2, `GET /partner/v2/applications` and `GET /partner/v2/applications/{id}` return them when you pass `include_generic=true`; their `property_id` and `unit_id` are `null` until the unit is set. Without the parameter, both endpoints hide them as v1 does, so `property_id` is never `null` there. In the v2 specification only these two responses declare `property_id` as nullable (`ApplicationListWithGeneric`, `ApplicationDetailWithGeneric`); every other application response keeps it non-null. An API key scoped to some properties never sees them, since they belong to no property. Approving, rejecting and the other actions answer 404 for them until the unit is set.

Applications in v2 also carry `generic_application_option_id` and `generic_application_option_label`: the option the application was started from, kept once its unit is set, or `null` for an application started for a unit.

## What does not change

- Every other endpoint, field and error is the same as in v1.
- Webhook payloads are not versioned. `property_created`, `property_updated` and the other events keep the v1 shape, so `owner` stays a string there.
- Public listing endpoints under `/crm/v1/` are not part of Partner API versioning.

## Moving from v1 to v2

1. Regenerate your client from `screening-api-docs/v2/api.json`, or read `owner.name` wherever you read `owner` today.
2. Change the base path from `/partner/v1/` to `/partner/v2/`, starting with `authenticate`. Try it on `api.sandbox.boompay.app` first.
3. Keep handling webhook payloads as before.
