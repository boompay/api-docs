---
title: PMS-controlled fields
---

Properties and units synced from a property management system (Rent Manager, Yardi, AppFolio and others) get some of their values from the PMS. Each sync rewrites those values, so a change made through the API to a field the PMS controls would be silently undone. The API refuses such a change instead, and lets you take a field over from the PMS when you want your value to stay.

The same settings are shown in the Portal as **Sync with PMS** / **Edit manually** on each field. A change in either place shows in the other.

## Which fields the PMS controls

`GET /partner/v1/properties/{id}` and `GET /partner/v1/units/{id}` return `pms_id` and `pms_sync`. `pms_sync` lists only the fields the PMS supplies for that record:

```json
{
  "pms_id": "RM-1042",
  "pms_sync": {
    "monthly_rent_amount": true,
    "description": false,
    "listed": true
  }
}
```

| Value | Meaning |
|---|---|
| `true` | The PMS controls the field. A change to it is refused. |
| `false` | The field was taken over. The PMS sync leaves it alone and your value is kept. |
| *(absent)* | The PMS does not supply the field. Change it freely. |

A record with no `pms_id` has an empty `pms_sync` and no restrictions.

Some fields are rewritten by every sync and have no setting, so a change is always refused on a PMS-synced record:

- `external_id` on properties and units.
- `manufacturer`, `model_name` and `manufactured_date` on Rent Manager units.
- `waitlist` on a Rent Manager unit whose custom field mapping writes it.

`listed` and `available_for_application` are PMS-controlled only when the PMS publishes listings on every sync. On a single-family property, `description`, `amenities` and the pet policy are controlled when either the property or its unit gets them from the PMS.

## A refused change

An update that changes a PMS-controlled value is refused as a whole. Nothing in the request is saved, including fields the PMS does not control:

```json
{
  "error": {
    "message": "The PMS controls monthly_rent_amount, description. Change them in the PMS, or first turn PMS sync off with pms_sync for the ones pms_sync lists.",
    "status": 400,
    "code": "pms_controlled_fields",
    "fields": ["monthly_rent_amount", "description"],
    "request_id": "4f0d8c1e-2b1a-4a5e-9c3d-7e6f5a4b3c2d"
  }
}
```

`fields` names every refused field. Sending the current value back is not a change and is accepted, so you can send a full record you read earlier.

## Taking a field over

Send `pms_sync` with `false` for the field, in the same request as the change or before it:

```http
PATCH /partner/v1/units/{id}
```

```json
{
  "pms_sync": { "monthly_rent_amount": false },
  "monthly_rent_amount": { "cents": 185000, "currency": "USD" }
}
```

From then on the PMS sync keeps your value. The three rent amounts (`monthly_rent_amount`, `home_rent_amount`, `site_rent_amount`) are taken over and handed back together, because the PMS writes them as a set.

## Handing a field back

Send `true`. Boom restores the value the PMS last sent, when it has one, and later syncs control the field again:

```json
{ "pms_sync": { "monthly_rent_amount": true } }
```

A `pms_sync` setting for a field the PMS does not supply is refused with code `pms_sync_not_available`, and `null` is refused as a parameter error.

## Behaviour change

Previously, renaming, moving, or changing the market or owner of a PMS-synced property through the API turned PMS sync off for that field and saved the change, and every update to a PMS-synced unit was refused with `Can't update unit`. Now the property change is refused with `pms_controlled_fields` until the field is taken over, and PMS-synced units accept changes to every field the PMS does not control. The property `pms_overrides` request field still works and means the same as `pms_sync`, but is deprecated.
