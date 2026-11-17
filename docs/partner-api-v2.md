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

- `GET /partner/v2/properties`, `GET /partner/v2/properties/{id}`, `POST /partner/v2/properties`, `PATCH /partner/v2/properties/{id}` and `POST /partner/v2/properties/{id}/set_bank_account`
- `GET /partner/v2/units/{id}`, `POST /partner/v2/units` and `PATCH /partner/v2/units/{id}` (`property`)
- `GET /partner/v2/property_groups/{id}` (`properties`)
- `GET /partner/v2/users`, `GET /partner/v2/users/{id}`, `POST /partner/v2/users` and `PATCH /partner/v2/users/{id}` (`properties`)

### Create and update a property with an `owner` object

`POST /partner/v2/properties` and `PATCH /partner/v2/properties/{id}` accept `owner` as the same object the response returns:

```json
{ "owner": { "name": "Jane Owner", "email": "jane@example.com", "phone": "5551234567" } }
```

`owner_name` is still accepted but deprecated. When a request sends both, `owner` is used. In v1, send `owner_name` as before.

### PMS-controlled `name`, `address`, `market` and owner are refused

On a property synced from a property management system (it has a `pms_id`), a field is controlled by the PMS when its PMS sync is on (`pms_overrides.<field>` is `true`) and the PMS has sent a value for it. Changing such a field is refused as a whole, with nothing saved:

```json
{
  "error": {
    "message": "These fields are controlled by the PMS: name. Set pms_overrides to false for them to change them.",
    "status": 422,
    "code": "pms_controlled_fields",
    "fields": ["name"],
    "request_id": "4f0d8c1e-2b1a-4a5e-9c3d-7e6f5a4b3c2d"
  }
}
```

| `PATCH /properties/{id}` changes a PMS-controlled... | v1 | v2 |
|---|---|---|
| `name`, `address`, `market` or the owner | Turns that field's PMS sync off and saves the change | `422` `pms_controlled_fields`, nothing saved |
| `property_type`, `description`, `amenities`, `pet_policy`, `custom_button_link`, `prescreening_template_id` | `422` `pms_controlled_fields`, nothing saved | `422` `pms_controlled_fields`, nothing saved |

To change the field in v2, send `"pms_overrides": {"<field>": false}` in the same request as the new value, or before it. Sending the current value is not a change. Units follow the same rule in both versions.

### `"available_at": null` clears a unit's available date

`PATCH /partner/v2/units/{id}` with `"available_at": null` clears the date. v1 ignores the `null` and keeps the date, because clients generated from the v1 specification often send `null` for every field they do not set.

### Nested properties follow the API key's property scope

With an API key scoped to some properties, the `properties` array of a user (`GET`/`POST /partner/v2/users`, `GET`/`PATCH /partner/v2/users/{id}`) and of a property group (`GET /partner/v2/property_groups/{id}`) lists only the properties in the key's scope. In v1 these arrays list every property of the user or group. Keys without a property scope see every property in both versions.

## What does not change

- Every other endpoint, field and error is the same as in v1. The property and unit fields added with the PMS-controlled field rule (`property_type`, `amenities`, `pet_policy`, `pms_id`, `pms_overrides`, `listing_url`, the unit's `beds`, `lease_terms`, manufactured housing fields and the rest) are returned and accepted by both versions.
- Webhook payloads are not versioned. `property_created`, `property_updated` and the other events keep the v1 shape, so `owner` stays a string there; they carry the new property and unit fields too.
- Public listing endpoints under `/crm/v1/` are not part of Partner API versioning.

## Moving from v1 to v2

1. Regenerate your client from `screening-api-docs/v2/api.json`, or read `owner.name` wherever you read `owner` today.
2. If you rename, move or change the market or owner of PMS-synced properties, handle `422` `pms_controlled_fields`, or send `pms_overrides` with `false` for those fields along with the change.
3. If your client sends `"available_at": null` for units it doesn't mean to change, stop sending it: in v2 it clears the date.
4. Change the base path from `/partner/v1/` to `/partner/v2/`, starting with `authenticate`. Try it on `api.sandbox.boompay.app` first.
5. Keep handling webhook payloads as before.
