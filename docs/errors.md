---
title: Errors and request IDs
---

Every error from the Partner API uses one JSON envelope, whatever produced it (parameter validation, authentication, rate limiting, a business rule, or an unexpected failure):

```json
{
  "error": {
    "message": "Customer can not be enrolled",
    "status": 422,
    "code": "validation_error",
    "request_id": "4f0d8c1e-2b1a-4a5e-9c3d-7e6f5a4b3c2d"
  }
}
```

| Field | Always present | Meaning |
|---|---|---|
| `message` | yes | Human-readable explanation. Wording may change; do not branch on it. |
| `status` | yes | The HTTP status, repeated in the body. |
| `code` | almost always | Stable machine-readable code. Branch on this. A few legacy business-rule errors return only `message`; treat a missing `code` as `bad_request`. |
| `request_id` | yes | Correlation id for the request. Also sent as the `X-Request-Id` response header. |

Some codes add fields:

- `validation_error` adds `errors`, an array of one string per failing parameter.
- `api_error` adds `error_id` (unique to this failure) and `error_signature` (identical for repeats of the same underlying bug).
- `POST /partner/v1/customers/check` adds `details`, a map of field → reason.

## Error codes

| HTTP | `code` | When |
|---|---|---|
| 400 | `validation_error` | A parameter is missing, has the wrong type, or fails a documented constraint. `errors` lists each problem. |
| 400 | `invalid_request_body` | The body is not valid JSON for the declared `Content-Type`. |
| 400 | `bad_request` / *(none)* | A business rule rejected the request, for example `Customer already have active enrollment`. |
| 401 | `unauthenticated` | Missing, malformed, expired or revoked bearer token, or the partner has no API access. Request a new token with `POST /partner/v1/authenticate`. |
| 402 | `stripe_card_error` | A card payment failed. `stripe_code` and `stripe_decline_code` carry Stripe's reason. |
| 403 | `forbidden` | The key is read-only and the request is a write, or the user role does not permit the action. |
| 404 | `not_found` | No such record for this partner. Also returned for records outside a scoped key's owners or property groups. |
| 405 | `method_not_allowed` | The path exists but not for this HTTP method. |
| 400 | *(none)*, message `cant_approve` / `cant_reject` / `cant_cancel` | An application decision was attempted on an application that is not in a decidable state. Nothing changed; fetch the application and inspect its `status`. |
| 409 | `invalid_state_transition` | A lifecycle transition the record does not allow from its current state. |
| 409 | `lock_failed` | The record changed while your request was in flight. Nothing changed; fetch it again and retry. |
| 412 | `precondition_failed` | The `If-Match` validator you sent no longer matches the record's `ETag`. Nothing changed. See [Concurrency and conflicts](concurrency.md). |
| 422 | `validation_error` / *(none)* | The request was understood but cannot be processed, for example a customer that fails eligibility. |
| 429 | `rate_limited` | Rate limit exceeded. Honour the `Retry-After` header. See [Rate limits](rate-limits.md). |
| 500 | `api_error` | Unexpected server error. Quote `request_id` and `error_id` to support. |
| 503 | `request_timeout` | The request exceeded the server's processing time. Safe to retry GETs; for writes, fetch the record first to see whether the change was applied. |

Codes are stable: a code is never renamed or removed within `/partner/v1/`. New codes may be added at any time, so treat an unknown code by its HTTP status.

## Request IDs

Every response, success or failure, carries an `X-Request-Id` header. Error bodies repeat it as `request_id`.

- **Send your own.** If you include an `X-Request-Id` header of 1–128 characters from `A–Z a–z 0–9 _ . -`, it is used as-is and echoed back, so you can correlate with your own logs. Anything else is replaced with a generated UUID.
- **Log it.** Store the id with every request you make.
- **Quote it.** Include the `request_id` (and `error_id` for a 500) when contacting support@boompay.app. It lets us find the exact request in our logs.

## Retrying

- `GET` requests are safe to retry.
- On `429` wait for `Retry-After` seconds before retrying; see [Rate limits](rate-limits.md) for a backoff recipe.
- Make writes conditional with `If-Match` when a human or another integration may edit the same record; see [Concurrency and conflicts](concurrency.md).
- On `5xx` or a network failure after a write, **read the record back before retrying**. `POST /partner/v1/enrollments/{id}/report_rental_payments` and application decisions have real-world side effects, and the API does not yet accept an idempotency key.
