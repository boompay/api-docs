---
title: Rate limits
---

The Partner API is rate limited per client, using a rolling one-minute window.

| Scope | Default limit |
|---|---|
| `/partner/v1/*` | 650 requests per minute per source IP |
| `POST /partner/v1/customers/{customer_id}/issue_access_token` | 2,500 requests per minute per source IP (SDK token issuance) |

Limits are enforced per source IP address. If several of your systems share one egress IP they share the budget; contact support if you need a higher limit for a specific integration.

## What a throttled response looks like

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 37
X-RateLimit-Limit: 650
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1767225637
X-Request-Id: 4f0d8c1e-2b1a-4a5e-9c3d-7e6f5a4b3c2d

{
  "error": {
    "message": "Too many requests. Please try again later.",
    "status": 429,
    "code": "rate_limited",
    "request_id": "4f0d8c1e-2b1a-4a5e-9c3d-7e6f5a4b3c2d"
  }
}
```

| Header | Meaning |
|---|---|
| `Retry-After` | Seconds until the window resets. Wait at least this long. |
| `X-RateLimit-Limit` | Requests allowed per window for this client. |
| `X-RateLimit-Remaining` | Always `0` on a 429. |
| `X-RateLimit-Reset` | Unix time (seconds) when the window resets. |

## How to back off

1. On a 429, sleep for `Retry-After` seconds, then retry.
2. If you are throttled again, double the wait each time (`Retry-After`, ×2, ×4 …) and add up to one second of random jitter, capped at 60 seconds.
3. Give up after five attempts and alert; a persistent 429 means the integration needs to send fewer requests, not retry harder.
4. Only retry `GET` requests automatically. For writes, read the record back first: a request that was throttled was **not** applied, but a request that timed out might have been.

## Staying under the limit

- Use `per_page=1000` when paging through large collections (see [Pagination](pagination.md)) instead of many small pages.
- Use the updated-since filters for incremental sync rather than re-reading whole collections.
- Subscribe to [webhooks](https://docs.boompay.app/webhooks) for state changes instead of polling.
- Cache the JWT from `POST /partner/v1/authenticate` for its lifetime rather than authenticating per request.
