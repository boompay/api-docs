---
title: Live applicant status
---

Know which applicants are in the applicant app right now, so your leasing team can reach out while they are still applying. The status is the one Live View shows in the Portal: an applicant is active while they have an application they have not submitted open in the applicant app.

There are two ways to get it:

- **Webhooks** `applicant_active` and `applicant_inactive`, sent when an applicant arrives and leaves. Use these to reach out right away.
- **`GET /partner/v1/applicants/active`**, the applicants active right now. Use it to reconcile: a poll every few minutes misses applicants who stay in the app for less than that.

Only available for companies with Live View turned on. Every response and event only covers your own applications. A property-scoped API key only lists the applicants on its properties; a webhook subscription receives events for every applicant in the company.

## When an applicant is active

| Situation | Status |
|---|---|
| Opens an application in the applicant app | Active within a few seconds |
| Moves between steps | Still active; `step` follows within a minute |
| Reloads the page or loses the network for less than 15 seconds | Still active |
| Closes the tab | Inactive about 15 seconds later |
| Leaves the tab in the background for 2 minutes, or is idle for 5 minutes | Inactive |
| Submits their part of the application | Inactive (nothing left to help with), or once the Live View session ends if someone is watching their screen |

## Webhooks

Subscribe to these events on **Settings > API** in the Portal. Delivery, the `X-API-KEY` header, `request_id` and retries work exactly as for every other [Boom webhook](https://docs.boompay.app/webhooks).

| Event | Sent when |
|---|---|
| `applicant_active` | An applicant opens the applicant app. Sent right away. |
| `applicant_inactive` | An applicant left and has not come back for 5 minutes. |

`applicant_inactive` waits 5 minutes on purpose: an applicant who switches tabs or loses the network for a moment and comes back within that time triggers neither event. The two events always alternate when they are sent, but a retried delivery can arrive after a newer event: use `live_status.status_changed_at` to order them and ignore an event older than the last one you processed.

### Payload

| Field | Description |
|---|---|
| `event` | `applicant_active` or `applicant_inactive`. |
| `request_id` | Unique ID of this delivery. |
| `applicant` | The applicant, with the same fields as in the application webhooks: `id`, `first_name`, `last_name`, `email`, `phone`, `role`, `application_status`, `external_id`, `external_customer_id`, `lead_id`, `is_primary` and the timestamps. |
| `application` | `{ id, portal_url, status, external_id }`. |
| `live_status.status` | `active` or `inactive`. |
| `live_status.step` | Where the applicant is in the application, for example `Income`; `null` when unknown. It is display text, the label the applicant app shows, and can change without notice: show it to your team, but do not build rules on its value. |
| `live_status.active_since` | When the current visit started; `null` when inactive. |
| `live_status.last_seen_at` | The last time the applicant app reported the applicant. |
| `live_status.status_changed_at` | When the applicant arrived or left. On `applicant_inactive` this is when they left, about 5 minutes before the event. |

### Example: `applicant_active`

```json
{
  "event": "applicant_active",
  "request_id": "<request id>",
  "applicant": {
    "id": "<applicant id>",
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "phone": "2125550100",
    "role": "applicant",
    "application_status": "pending",
    "external_id": null,
    "external_customer_id": null,
    "lead_id": "<lead id>",
    "is_primary": true
  },
  "application": { "id": "<application id>", "portal_url": "https://…", "status": "pending", "external_id": null },
  "live_status": {
    "status": "active",
    "step": "Income",
    "active_since": "2026-11-16T16:32:29+00:00",
    "last_seen_at": "2026-11-16T16:32:29+00:00",
    "status_changed_at": "2026-11-16T16:32:29+00:00"
  }
}
```

### Example: `applicant_inactive`

```json
{
  "event": "applicant_inactive",
  "request_id": "<request id>",
  "applicant": { "id": "<applicant id>", "first_name": "Jane", "last_name": "Doe", "email": "jane@example.com" },
  "application": { "id": "<application id>", "portal_url": "https://…", "status": "pending", "external_id": null },
  "live_status": {
    "status": "inactive",
    "step": "Income",
    "active_since": null,
    "last_seen_at": "2026-11-16T16:40:02+00:00",
    "status_changed_at": "2026-11-16T16:40:17+00:00"
  }
}
```

The `applicant` object is shortened here; it carries the same fields as in `applicant_active`.

## `GET /partner/v1/applicants/active`

Applicants active right now, longest active first (`active_since`, then ID; it does not move while an applicant stays active), with the usual `page` / `per_page` [pagination](pagination.md). Each item has `applicant_id`, `application_id`, `first_name`, `last_name`, `email`, `phone`, `external_id`, `external_customer_id` and `lead_id` to match the applicant in your CRM (`external_customer_id` and `lead_id` are the same as in the webhooks), plus `status` (always `active`), `step`, `active_since` and `last_seen_at`.

Applicants leave the list as they go, which shifts the pages after them, so read it in one request: `per_page` goes up to 1000.

Unlike the webhooks, this list is not delayed: an applicant drops off it about 15 seconds after closing the tab.
