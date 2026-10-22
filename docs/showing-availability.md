---
title: Showing availability
---

`GET /partner/v1/units/{id}/showing_availability` returns the open tour times for a unit: the same times Boom's Schedule a tour page offers for it at that moment. It is read-only. Nothing is booked, held or reserved, and no time is hidden from anyone else.

## Request

| Parameter | In | Notes |
|---|---|---|
| `id` | path | Unit ID from `GET /partner/v1/units`. |
| `start_date` | query, optional | `YYYY-MM-DD` in the property's local time zone. Defaults to today. A past date is treated as today. |
| `end_date` | query, optional | `YYYY-MM-DD`, inclusive. Defaults to `start_date` plus 13 days (14 days in total). |

Date range rules:

- At most 14 days, both ends included. A longer range, a `start_date` after `end_date`, or an `end_date` before today returns 400 `invalid_date_range`.
- A badly formatted date returns 400 `validation_error`.
- Days past the partner's booking window simply have no times. That is not an error.

Authentication is the same as every Partner API endpoint, and read-only keys work. A key scoped to owners or property groups gets 404 for units outside its properties.

## Which times are returned

- Guided or self-guided follows the unit's listing template, and `showing_type` says which.
- Times respect the showing duration (they never overlap), booking window, minimum notice, and the maximum visits per unit per day and per week.
- Guided times come from the agents who can show the property: weekly hours, blocked days, date overrides, buffers and busy times on connected calendars. Agent names are never included.
- Self-guided times come from the self-guided hours on the listing template.
- A time already booked on the unit (including showings awaiting confirmation) or held by another renter on the Schedule a tour page is not offered.
- When the partner lets leads book into scheduled showings, booked times that still have room are included with `joins_existing_showing: true`.
- Recommended and suggested times from intelligent scheduling are not included.

Times can be up to about 30 seconds old, and a time can be taken by someone else before it is booked.

## Response

```json
{
  "unit_id": "Xk2pQ9rT4mN8bV1c",
  "showing_type": "guided",
  "time_zone": "America/Chicago",
  "duration_minutes": 30,
  "range": { "start_date": "2026-10-22", "end_date": "2026-11-04" },
  "booking_window_ends_on": "2027-01-20",
  "times": [
    { "date": "2026-10-23", "start": "2026-10-23T10:00:00-05:00", "end": "2026-10-23T10:30:00-05:00", "joins_existing_showing": false },
    { "date": "2026-10-23", "start": "2026-10-23T10:30:00-05:00", "end": "2026-10-23T11:00:00-05:00", "joins_existing_showing": true }
  ],
  "next_available": null,
  "empty_reason": null
}
```

| Field | Meaning |
|---|---|
| `showing_type` | `guided` or `self_guided`. |
| `time_zone` | IANA time zone of the property. All dates are local to it. |
| `duration_minutes` | Tour length. |
| `range` | The dates actually covered, after defaults and clamping. |
| `booking_window_ends_on` | The last date anyone can book the unit right now; `null` when no one can show it. |
| `times[]` | `date` (local), `start` and `end` (date-time with offset), `joins_existing_showing`. |
| `next_available` | Only when `times` is empty: the first open time after the range, within the booking window, or `null`. |
| `empty_reason` | Only when `times` is empty: `no_times_in_range`, `beyond_booking_window` or `no_open_times`. |

A self-guided unit returns the same shape with `"showing_type": "self_guided"`. An empty range looks like:

```json
{
  "unit_id": "Xk2pQ9rT4mN8bV1c",
  "showing_type": "guided",
  "time_zone": "America/Chicago",
  "duration_minutes": 30,
  "range": { "start_date": "2026-10-22", "end_date": "2026-10-28" },
  "booking_window_ends_on": "2027-01-20",
  "times": [],
  "next_available": { "date": "2026-11-12", "start": "2026-11-12T14:00:00-06:00", "end": "2026-11-12T14:30:00-06:00", "joins_existing_showing": false },
  "empty_reason": "no_times_in_range"
}
```

## Errors

All errors use the standard envelope (see Errors). `code` is the machine-readable reason.

| Status | `code` | When |
|---|---|---|
| 400 | `invalid_date_range` | Range longer than 14 days, start after end, or end before today. |
| 400 | `validation_error` | A date is not `YYYY-MM-DD`. |
| 401 | `unauthenticated` | Missing, expired or invalid token. |
| 404 | `not_found` | Unknown unit, another partner's unit, outside a scoped key's properties, or the unit is unlisted. |
| 422 | `showings_not_enabled` | Showings are off for the partner or on the listing template, the unit has no listing template, or Boom can't work out the property's time zone. |
| 422 | `unit_on_waitlist` | The unit is on the waitlist. |
| 429 | `rate_limited` | Partner API rate limit (see Rate limits). |

## Listing sites

Listing sites that receive a Boom listing feed (for example AffordableHousing.com) read the same times through their own endpoint:

```
GET /listing_sites/v1/listings/{listing_id}/showing_availability
Authorization: Bearer lsk_...
```

- **Key.** Boom staff issue each listing site its own key. Boom can revoke it at any time, and it stops working immediately. It only works on this endpoint; it cannot reach any Partner API data, and Partner API tokens don't work here. A missing, invalid or revoked key returns 401 `unauthenticated`.
- **Which units.** Only listings currently in your site's Boom feed, at any Boom partner. Any other listing (unchecked by the partner, over your site's rent cap, removed from the feed, or nonexistent) returns 404 `not_found`, and the response never says whether it exists elsewhere in Boom.
- **Identifier.** `listing_id` is the `id` of the `<Listing>` element in your feed, the same ID you send back with each lead.
- **Request, response and errors** are the same as above, with `listing_id` (a number) in place of `unit_id`.
- **Rate limit.** 600 requests per minute per key. Over the limit returns 429 `rate_limited` with `Retry-After`. Repeated requests with an invalid key (30 in a minute from one IP) are also throttled.
- Times can be up to about 30 seconds old, and a time can be taken before it is booked.
