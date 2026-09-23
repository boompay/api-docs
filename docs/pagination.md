---
title: Pagination and ordering
---

Every endpoint that returns a collection accepts the same two query parameters and returns the same envelope.

## Parameters

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `page` | integer ≥ 1 | 1 | 1-based page number. |
| `per_page` | integer 1–1000 | 20 | Values above 1000 are silently clamped to 1000. Values below 1 return `400 validation_error`. |

## Envelope

```json
{
  "object": "list",
  "items": [ ... ],
  "current_page": 2,
  "page_count": 12,
  "total_count": 234,
  "has_more": true
}
```

| Field | Meaning |
|---|---|
| `items` | The records for this page. |
| `current_page` | The page you asked for. |
| `page_count` | Total pages at this `per_page`. |
| `total_count` | Total matching records. |
| `has_more` | `true` when `current_page < page_count`. |

`GET /partner/v1/applications` additionally returns `last_page` (the inverse of `has_more`) for integrations built before `has_more` existed. It is deprecated; new code should use `has_more`.

Two endpoints are not paginated and do not use the envelope: `GET /partner/v1/customers/{customer_id}/issues` returns `{"issues": [...]}`, and `GET /partner/v1/bank_accounts` returns the account's few bank accounts directly.

## Ordering guarantee

Every list endpoint applies a fixed total order that ends with the record's primary key, so:

- the same request returns the same page as long as the underlying data has not changed, and
- two consecutive pages never overlap or skip a record that existed when you started.

The default order is newest first (descending id), with these exceptions:

- `GET /partner/v1/customers` accepts `order_by` (default `created_at`) and `order_direction` (`asc` | `desc`, default `desc`); ties are broken by id.
- `GET /partner/v1/listings` returns ascending id.
- `GET /partner/v1/units` returns ascending title for some property-management-system integrations, ties broken by id.
- `GET /partner/v1/roles` returns ascending name.

Records created while you page will appear at the start of the collection (newest first) and will not disturb the pages you have already read. Records deleted while you page shift later pages by one; if you need an exact snapshot, page quickly or filter by an updated-since date.

## Incremental sync

To pull only what changed since your last run, use the date filters below with pagination. All are inclusive and interpreted as whole days in UTC (the from-date starts at 00:00:00, the to-date ends at 23:59:59).

| Endpoint | Filter |
|---|---|
| `GET /partner/v1/applications` | `last_updated_from_date`, `last_updated_to_date` |
| `GET /partner/v1/properties` | `updated_at_from_date`, `updated_at_to_date` |
| `GET /partner/v1/units` | `updated_at_from_date`, `updated_at_to_date` |
| `GET /partner/v1/leads` | `updated_at_from_date`, `updated_at_to_date` |
| `GET /partner/v1/billing/statements`, `/billing/activities` | `start_date`, `end_date` |
| `GET /partner/v1/applications/activity_logs` | `from_date`, `to_date` |

Because the filters are day-granular, run each sync with the from-date set to the previous run's date (not the day after) and de-duplicate on `id` + `updated_at`. Endpoints without a filter (customers, enrollments, listings, users, magic links) must be read in full; every record carries `updated_at` so you can diff locally.

For near-real-time updates use [webhooks](https://docs.boompay.app/webhooks) instead of polling.
