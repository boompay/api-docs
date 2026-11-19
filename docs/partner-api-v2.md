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
| `description`, `amenities`, `pet_policy` | `422` `pms_controlled_fields`, nothing saved | `422` `pms_controlled_fields`, nothing saved |

`property_type`, `custom_button_link` and `prescreening_template_id` are never written by the PMS, so they can always be changed in both versions.

`external_id` of a property with a `pms_id` always follows the PMS in v2: every sync writes it back and it has no `pms_overrides` key, so a change answers `422` `pms_controlled_fields` with `fields` `["external_id"]`. Sending the current value is accepted. v1 still saves a changed `external_id`.

To change the field in v2, send `"pms_overrides": {"<field>": false}` in the same request as the new value, or before it. Use the keys `pms_overrides` returns: the pet policy is `cats_allowed` and `dogs_allowed` (not `pet_policy`), and the owner is `property_owner_name`, `property_owner_phone` and `property_owner_email`. Any other key is ignored without an error. Sending the current value is not a change. Send `true` to give the field back to the PMS: Boom restores the last value the PMS sent where it keeps a copy. For `description`, a single-family property gets back its unit's last PMS description; a multi-family property keeps no PMS copy, so its current text stays until the PMS sends a new one. On a unit, `manufacturer`, `model_name`, `manufactured_date`, `listed` and `available_for_application` also keep their current value until the next sync. Units follow the same rule in both versions, except that v1 lets partners whose PMS units come through integration credentials change the older unit fields freely (see below).

### `"available_at": null` clears a unit's available date

`PATCH /partner/v2/units/{id}` with `"available_at": null` clears the date. v1 ignores the `null` and keeps the date, because clients generated from the v1 specification often send `null` for every field they do not set.

### The PMS-controlled field rule covers every PMS unit

`PATCH /partner/v2/units/{id}` applies the PMS-controlled field rule to every unit with a `pms_id`. In v1, a partner with no account-level PMS setting (its PMS units come through integration credentials) can still change `title`, `monthly_rent_amount`, `available_at`, `occupied`, `verification_template_id`, `external_id`, `listing_id` and `max_occupants` on those units as before; every newer unit field (`description`, `beds`, `amenities`, the pet policy, `lease_terms` and the rest) follows the rule in v1 too.

### A unit's own screening template

`verification_template_id` on a unit (Get, List, Create and Update a unit, and the units of a property) is the unit's own screening template, or the property's when the unit has none. v1 and webhooks return the property's template.

### Invalid units refuse Create a property

`POST /partner/v2/properties` checks every element of `units` before creating anything. A unit that breaks a business rule (home rent and lot rent not adding up to the monthly rent, an amenity name that matches no amenity) answers `422` code `invalid_units`, with `fields` naming each refused unit once as `units[<index>]` and `errors` holding one item per failed check (so a unit that fails two checks appears twice), and nothing is created. v1 skips such a unit and creates the property with the others. A wrong-typed field answers `400` in both versions.

### Nested properties follow the API key's property scope

With an API key scoped to some properties, the `properties` array of a user (`GET`/`POST /partner/v2/users`, `GET`/`PATCH /partner/v2/users/{id}`) and of a property group (`GET /partner/v2/property_groups/{id}`) lists only the properties in the key's scope. In v1 these arrays list every property of the user or group. Keys without a property scope see every property in both versions.

## What does not change

- Every other endpoint, field and error is the same as in v1. The property and unit fields added with the PMS-controlled field rule (`property_type`, `amenities`, `pet_policy`, `pms_id`, `pms_overrides`, `listing_url`, the unit's `beds`, `lease_terms`, manufactured housing fields and the rest) are returned and accepted by both versions.
- Webhook payloads are not versioned. `property_created`, `property_updated` and the other events keep the v1 shape, so `owner` stays a string there; they carry the new property and unit fields too.
- Public listing endpoints under `/crm/v1/` are not part of Partner API versioning.

## Moving from v1 to v2

1. Regenerate your client from `screening-api-docs/v2/api.json`, or read `owner.name` wherever you read `owner` today.
2. If you rename, move or change the market or owner of PMS-synced properties, handle `422` `pms_controlled_fields`, or send `pms_overrides` with `false` for those fields along with the change. Stop changing the `external_id` of PMS-synced properties: v2 refuses it.
3. If your client sends `"available_at": null` for units it doesn't mean to change, stop sending it: in v2 it clears the date.
4. If your PMS units come through integration credentials, handle `422` `pms_controlled_fields` on unit updates, or send `pms_overrides` with `false` for those fields along with the change.
5. If you create properties with `units`, handle `422` `invalid_units`: nothing is created, where v1 skipped the bad units.
6. If you read a unit's `verification_template_id`, expect the unit's own template where it has one.
7. Change the base path from `/partner/v1/` to `/partner/v2/`, starting with `authenticate`. Try it on `api.sandbox.boompay.app` first.
8. Keep handling webhook payloads as before.
