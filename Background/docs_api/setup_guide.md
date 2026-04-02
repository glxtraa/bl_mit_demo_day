# SSCAP API: Reconstruction Guide

Follow these steps to rebuild this API from scratch or deploy it for a new project.

## 1. Prerequisites
- **Next.js (App Router)**: Initialized with `npx create-next-app@latest sscap-api`.
- **Node.js**: Version 20 or higher.
- **Vercel SDK**: `@vercel/blob` installed.

## 2. Vercel Storage Setup
1.  Go to the **Vercel Dashboard > Storage**.
2.  Create a new **Blob** store called `sscap-api-blob`.
3.  **IMPORTANT**: Set the access to **Public**.
4.  **Connect** the store to your project. Vercel will create the `BLOB_READ_WRITE_TOKEN`.
5.  Run `vercel env pull` locally to fetch the token.

## 3. Core API Logic (POST)
- **Endpoints**: `/api/utilizado`, `/api/captado`, `/api/nivel`.
- **Payload Schema (TypeScript `number` handles all numeric types)**:
  - `tlaloque_id`: **String**
  - `pulses` (utilizado): **Long Int** (Safe up to 9 quadrillion)
  - `pulses` (captado): **Int**
  - `meters` (nivel): **Float** (Double precision)
  - `used_at` / `catched_at`: **String** (Preserved raw format)
- **Functionality**:
  - Parse JSON request body.
  - Validate required fields (tlaloque_id, measurement, timestamp).
  - Capture request metadata from headers (`x-real-ip`, `x-vercel-ip-city`, `user-agent`).
  - Store clearly separated `data` and `metadata` as a single JSON file in Blob.
  - Filename format: `sscap/[type]/[ISO-date]-[UUID].json` (Guaranteed unique).
  - Filename logic: Using `crypto.randomUUID()` ensures no two files ever collide.

## 4. Download Route (GET)
- **Endpoint**: `/api/download`.
- **Critical Settings**:
  - Set `export const dynamic = 'force-dynamic'` to prevent stale results.
  - Use `fetch(url, { cache: 'no-store' })` when reading blob content.
  - Return a JSON array of all records.

## 5. Proposed Security Token System
If you need to add security in the future, follow this plan:

1.  **Vercel Env**: Add `SSCAP_API_TOKEN` to your Vercel Environment Variables.
2.  **Middleware/Guard**: In each POST route, add this check:
    ```typescript
    const authHeader = request.headers.get('authorization');
    const token = process.env.SSCAP_API_TOKEN;
    if (!authHeader || authHeader !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    ```
3.  **Rotation**: For graceful rotation, use a comma-separated list of tokens in the environment variable.

## 6. Local Backup Script
Use the provided `scripts/download_data.js` to download all blobs into a local `.json` file for offline analysis.
