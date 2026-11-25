---
title: Facebook Marketplace leads (Muse)
---

Facebook Marketplace has no API or webhook for new messages, so renters who message you there never reach Boom on their own. If you use Muse to answer those messages, Muse can send Boom the first message each renter writes about a home. Boom then creates a Lead on that unit with the Lead Source **Facebook Marketplace**, and from there it works like any other new Lead: your agents are notified, it shows on the Leads screen and the Leasing dashboard, and your "New lead added" workflows and AI agent run.

## The address

```
POST https://api.production.boompay.app/v1/leads/ingest/muse
Content-Type: application/json
```

No login, API key or token is needed. Send the message as a JSON object in the request body.

## What Muse sends

| Field | Required | What it is |
|---|---|---|
| `unit_id` | Yes | Boom's numeric unit ID for the home the renter asked about. See [Finding a unit's ID](#finding-a-units-id). |
| `name` | Yes | The renter's name as Facebook shows it. Boom splits it on the first space: "Maria de la Cruz" becomes first name "Maria" and last name "de la Cruz". A single word becomes the first name. |
| `email` | Email or phone | The renter's email address. |
| `phone` | Email or phone | The renter's US phone number, in any common format. |
| `message` | No | What the renter wrote. It is shown on the Lead's "Lead created" activity. |

At least one of `email` and `phone` is required. If both are sent, both must be valid.

```json
{
  "unit_id": "48213",
  "name": "Maria de la Cruz",
  "email": "maria.cruz@example.com",
  "phone": "(770) 389-1867",
  "message": "Hi, is this still available? Can I see it this weekend?"
}
```

## What Boom answers

A successful request always gets the same answer, whether Boom created a new Lead, added the message to the renter's existing Lead, or ignored an exact repeat:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "success",
  "message": "Lead received successfully"
}
```

A refused request gets an error with a fixed `code` and `message`:

| Status | `code` | `message` | When |
|---|---|---|---|
| 400 | `invalid_request_body` | — | The body is not valid JSON. |
| 400 | `invalid_payload` | Body must be a JSON object | The body is JSON, but not an object (for example a list). |
| 400 | `missing_unit_id` | unit_id is required | `unit_id` is missing or blank. |
| 400 | `missing_name` | name is required | `name` is missing or blank. |
| 422 | `missing_contact_info` | email or phone is required | Neither `email` nor `phone` was sent. |
| 422 | `invalid_email` | email is not a valid email address | `email` is not an email address. |
| 422 | `invalid_phone` | phone is not a valid US phone number | `phone` is not a valid US number. |
| 404 | `unit_not_found` | Unit not found | No unit has that ID, or it was deleted. |
| 413 | — | Payload too large | The body is larger than 1 MB. |

The checks run in that order, and the first one that fails is returned. Example:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "error": {
    "message": "phone is not a valid US phone number",
    "status": 422,
    "code": "invalid_phone",
    "request_id": "4f0d8c1e-2b1a-4a5e-9c3d-7e6f5a4b3c2d"
  }
}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "message": "Unit not found",
    "status": 404,
    "code": "unit_not_found",
    "request_id": "9b2e7a10-5c3d-4f8e-a1b2-c3d4e5f60718"
  }
}
```

Boom keeps every submission it receives, accepted or refused, so Boom support can tell you why a message did not become a Lead. The one exception is a body that is not valid JSON, which is refused before it can be read.

## Repeat messages

Send only the renter's first message about each home. If more arrive anyway, Boom handles them the same way as repeat inquiries from Zillow or Apartments.com:

- **Same renter, same home.** When the email or phone matches a Lead already on that unit, Boom does not create a new Lead. The existing Lead keeps its original Lead Source, and a "New inquiry" entry with the message, marked "via Facebook Marketplace", is added to its activity log. If that Lead is in a closed stage, it moves back to New and your "New lead added" workflows run again.
- **Same email or phone, clearly a different person.** Boom creates a separate Lead.
- **Exact repeat** (for example, Muse retrying a request). Boom ignores it and answers with success.
- **Same renter, different home.** Boom creates a new Lead on that unit.

## Finding a unit's ID

1. In the Boom Portal, open **Properties**, then the property, then the unit.
2. The unit's ID is the number at the end of the address in your browser's address bar, after `/units/`. For example, if the address ends in `/properties/9120/units/48213`, the unit ID is `48213`.

<!-- Screenshot: unit details page with the unit ID highlighted in the address bar. -->

Any unit can receive messages, whether or not it is currently listed in Boom, because the Facebook post may still be up.

## Instructions for Muse

Paste this block into Muse, then replace the example home list with your own homes and their Boom unit IDs.

```text
When a renter messages us on Facebook Marketplace about one of our homes:

1. Before anything else, ask the renter for an email address or a phone number we can reach them on.
2. Once you have an email or a phone number, send ONE request to Boom for that renter and that home.
   Only send it for the renter's FIRST message about that home. Do not send later messages in the
   same conversation.
3. Send the request like this:

   POST https://api.production.boompay.app/v1/leads/ingest/muse
   Content-Type: application/json

   {
     "unit_id": "<the Boom unit ID of the home, from the list below>",
     "name": "<the renter's name as Facebook shows it>",
     "email": "<the renter's email, if they gave one>",
     "phone": "<the renter's phone number, if they gave one>",
     "message": "<the renter's first message, word for word>"
   }

   Leave out "email" or "phone" if the renter did not give it. At least one of them is required.
4. If Boom answers with an error, do not keep retrying the same request. "Unit not found" means the
   unit ID is wrong: check it against the list below.

Our homes and their Boom unit IDs:
- 123 Main St, Unit 2A: 48213
- 456 Oak Ave: 48390
```

## Good to know

- Muse must send the Boom unit ID. Boom does not match a Facebook post to a unit by itself.
- Boom does not reply to the renter on Facebook, and does not bring in the rest of the Facebook conversation.
- The address does not need a login. Anyone who has it can send messages to it, so share it only with Muse.
