---
title: Concurrency and conflicts
---

The Partner API processes requests in parallel and does not serialize writes to the same record. This page describes what happens when two writers collide and how to make your writes conditional.

## Default behaviour: last write wins

Without any precondition, a `PATCH` applies whatever fields it carries on top of the record's current state. If two integrations update the same record at the same time, the second write overwrites the fields it sends and leaves the others untouched. Nothing is lost silently *within* a single request, but two requests can interleave.

## Conditional writes with ETag and If-Match

Every single-resource read of a writable resource returns a weak `ETag` header. It is an opaque validator derived from the record's last modification; it changes whenever the record (or, for enrollments, its lease terms or landlord) changes.

| Resource | Read that returns `ETag` | Write that honours `If-Match` |
|---|---|---|
| Customers | `GET /partner/v1/customers/{customer_id}` | `PATCH /partner/v1/customers/{customer_id}` |
| Enrollments | `GET /partner/v1/enrollments/{enrollment_id}` | `PATCH /partner/v1/enrollments/{enrollment_id}`, `PATCH …/landlord` |
| Properties | `GET /partner/v1/properties/{id}` | `PATCH /partner/v1/properties/{id}` |
| Units | `GET /partner/v1/units/{id}` | `PATCH /partner/v1/units/{id}` |
| Application links | `GET /partner/v1/magic_links/{id}` | `PATCH /partner/v1/magic_links/{id}` |
| Users | `GET /partner/v1/users/{id}` | `PATCH /partner/v1/users/{id}` |
| Leads | `GET /partner/v1/leads/{lead_id}` | `PATCH /partner/v1/leads/{lead_id}` |

To make a write conditional, send the validator back:

```http
GET /partner/v1/units/9u6xajm5solct2x8
→ 200 OK
   ETag: W/"3f9a1c0b7e2d4a6f8b1c2d3e4f5a6b7c"

PATCH /partner/v1/units/9u6xajm5solct2x8
If-Match: W/"3f9a1c0b7e2d4a6f8b1c2d3e4f5a6b7c"
{"title": "Unit 4B"}
→ 200 OK
   ETag: W/"c0ffee0123456789abcdef0123456789"
```

- If the validator still matches, the write is applied and the response carries the **new** `ETag`.
- If the record changed since you read it, the write is **not applied** and you get `412 Precondition Failed` with `code: precondition_failed`. Fetch the record again, decide whether your change still makes sense, and retry with the new validator.
- `If-Match` accepts a comma-separated list, and `*` means "any current version" (an unconditional write).
- A request without `If-Match` is unconditional. Every successful `PATCH` returns the new `ETag` whether or not you sent one.

Recommended pattern for automations that edit records humans also edit in the Boom portal: read, modify, write with `If-Match`, and on 412 re-read and reconcile rather than retrying blindly.

## Other conflict responses

| HTTP | `code` | When |
|---|---|---|
| 412 | `precondition_failed` | `If-Match` did not match the record's current `ETag`. Nothing was written. |
| 409 | `lock_failed` | The server detected that the record changed while your request held it. Nothing was written; fetch and retry. |
| 409 | `invalid_state_transition` | A state change was attempted that the record's lifecycle does not allow. |
| 400 | *(none)*, message `cant_approve`, `cant_reject`, `cant_cancel` | Application decisions check the application's state before acting; a decision on an application that is no longer in a decidable state is refused with a 400 and the application is left as it was. |

## Concurrency limits

- There is no per-connection or per-partner concurrency cap. The only throttle is the [rate limit](/rate-limits) of 650 requests per rolling minute per source IP.
- Concurrent requests may complete in any order. If ordering matters to you, serialize on your side or use `If-Match`.
- Webhook deliveries for the same record can arrive out of order and can be retried; treat the record's `updated_at` from a fresh read as the source of truth rather than the order in which events arrived.
- Writes are not idempotent by request id yet. After a network failure on a `POST`, read the record back before retrying.
