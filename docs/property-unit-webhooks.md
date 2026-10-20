---
title: Property and unit webhooks
---

Subscribe to these events on **Settings > API** in the Portal to hear about property and unit changes as they happen, instead of polling `GET /partner/v1/properties` and `GET /partner/v1/units` with the updated-since filters. Each event carries the full record, so you can save it without another API call.

Delivery, the `X-API-KEY` header, `request_id` and retries work exactly as for every other [Boom webhook](https://docs.boompay.app/webhooks). A subscription receives events for every property and unit in the company, whatever properties the person who created it can see in the Portal.

## Events

| Event | Sent when |
|---|---|
| `property_created` | A property is created, or a deleted property is restored. |
| `property_updated` | Any detail of a property changes, including its photos. |
| `property_deleted` | A property is deleted. A `unit_deleted` is also sent for each of its units. |
| `unit_created` | A unit is created, a deleted unit is restored, or its property is restored. |
| `unit_updated` | Any detail of a unit changes, including its photos. |
| `unit_deleted` | A unit is deleted, or its property is deleted. |
| `unit_availability_changed` | The unit's available date, occupied, available for application or ready for showing date changes. Sent together with `unit_updated`. |
| `unit_listing_status_changed` | The unit's listed or waitlist setting changes. Sent together with `unit_updated`. |
| `unit_rent_changed` | The unit's monthly rent, home rent or lot rent changes. Sent together with `unit_updated`. |

Events fire for every source of a change: the Portal, the Partner API, a PMS sync and Boom itself. Several changes to the same record in one save or one sync arrive as one event listing all of them. A save or sync that changes no value sends nothing.

While a property is deleted, its units count as deleted too: they are not returned by the Units endpoints and no unit events are sent for them. Events can arrive out of order; use `changed_at` to order them.

## Payload

| Field | Description |
|---|---|
| `event` | The event name. |
| `request_id` | Unique ID of this delivery. |
| `changed_at` | When the change was made (ISO 8601). |
| `changed_by` | `partner_user` (a Portal user), `partner_api`, `pms_sync` or `system` (Boom automatically). |
| `changed_by_user` | `{ id, email, name }` when `changed_by` is `partner_user`, otherwise `null`. |
| `changed_by_pms` | The PMS name when `changed_by` is `pms_sync` (for example `rent_manager`), otherwise `null`. |
| `changes` | Only on `*_updated` and `*_changed` events: one `{ field, old, new }` entry per changed field, using the field names of the Partner API. A photo change is reported as `photos`, with the old and new photo IDs in order. |
| `unit` / `property` | The record exactly as `GET /partner/v1/units/{id}` or `GET /partner/v1/properties/{id}` returns it, plus `photos` (`[{ id, position, url }]`, in display order). On `*_deleted` events this is `{ id, external_id, property_id, deleted_at }` instead (`property_id` on units only), because the record no longer exists. |

### Example: `unit_rent_changed`

```json
{
  "event": "unit_rent_changed",
  "request_id": "<request id>",
  "changed_at": "2026-10-20T15:04:05Z",
  "changed_by": "partner_user",
  "changed_by_user": { "id": "<user id>", "email": "jane@acme-pm.com", "name": "Jane Doe" },
  "changed_by_pms": null,
  "changes": [
    { "field": "monthly_rent_amount", "old": { "cents": 150000, "currency": "USD" }, "new": { "cents": 160000, "currency": "USD" } }
  ],
  "unit": {
    "id": "<unit id>",
    "title": "101",
    "monthly_rent_amount": { "cents": 160000, "currency": "USD" },
    "available_at": "2026-11-01T00:00:00Z",
    "occupied": false,
    "property_id": "<property id>",
    "external_id": "RM-101",
    "property": { "id": "<property id>", "name": "Maple Court" },
    "photos": [{ "id": 991, "position": 0, "url": "https://…/full.jpg" }]
  }
}
```

### Example: `unit_deleted`

```json
{
  "event": "unit_deleted",
  "request_id": "<request id>",
  "changed_at": "2026-10-20T15:10:00Z",
  "changed_by": "pms_sync",
  "changed_by_user": null,
  "changed_by_pms": "rent_manager",
  "unit": { "id": "<unit id>", "external_id": "RM-101", "property_id": "<property id>", "deleted_at": "2026-10-20T15:10:00Z" }
}
```

## What is never included

Webhooks carry only what the Partner API returns. Tenant contacts, lockbox codes, internal IDs and PMS bookkeeping are never sent.
