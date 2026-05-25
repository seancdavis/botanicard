# Botanicard

Personal plant inventory system — houseplant tracking and garden season management.

## MCP File Upload Flow

Agents connected via the MCP server upload files using a three-step presigned-URL flow. No base64 encoding. No `Authorization` header on the upload itself.

### Overview

1. **Prepare** — call `prepare_upload` inside JSON-RPC to receive a signed URL and an opaque handle.
2. **PUT** — send raw bytes directly to the signed URL.
3. **Finalize** — call `finalize_upload` inside JSON-RPC to register the blob and receive a stable key.

### Step 1 — prepare_upload

```
POST /api/mcp
Authorization: Bearer <MCP_BEARER_TOKEN>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "prepare_upload",
    "arguments": {
      "filename": "garden.jpg",
      "contentType": "image/jpeg",
      "size": 204800
    }
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"uploadUrl\":\"https://yoursite.netlify.app/api/mcp/upload/blob/<signed-token>\",\"uploadHandle\":\"<uuid>\"}"
    }]
  }
}
```

### Step 2 — PUT raw bytes

No `Authorization` header. Capability is embedded in the signed URL.

```bash
curl -X PUT \
  "https://yoursite.netlify.app/api/mcp/upload/blob/<signed-token>" \
  -H "Content-Type: image/jpeg" \
  --data-binary @garden.jpg
```

Response on success:

```json
{ "uploadHandle": "<uuid>" }
```

The signed URL expires in **5 minutes** and is **single-use** — a second PUT to the same URL returns `409 already_used`.

### Step 3 — finalize_upload

```
POST /api/mcp
Authorization: Bearer <MCP_BEARER_TOKEN>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "finalize_upload",
    "arguments": {
      "uploadHandle": "<uuid>"
    }
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"key\":\"<uuid>-<filename>\"}"
    }]
  }
}
```

The returned `key` can be passed directly to:
- `create_note` → `photoKeys: ["<uuid>-<filename>"]`
- `update_planter` → `photoBlobKey: "<uuid>-<filename>"`

### Security

- **HMAC-SHA256 signed URL.** The signed token embeds the `uploadId`, declared `contentType`, declared `size`, and an expiry timestamp (`exp`). The server verifies the signature using `MCP_UPLOAD_SIGNING_SECRET` (distinct from `MCP_BEARER_TOKEN`) and rejects any tampered or expired token.
- **No auth header on the PUT.** The capability is entirely in the URL. Agents never need to expose the bearer token in a raw HTTP header outside the JSON-RPC envelope.
- **Single-use.** An atomic DB transition (`pending → uploaded`) ensures a second PUT with the same token always fails with `409 already_used`, even if the first request is still in flight on another server instance.
- **Content-type enforced byte-exact.** The `Content-Type` header on the PUT must match what was declared in `prepare_upload`. A mismatch returns `400 content_type_mismatch`.
- **Size enforced as upper bound.** The PUT body must be `<= size`. Going over returns `413 size_mismatch`; padding under is fine.
- **TTL: 5 minutes.** Expired tokens return `410`.
