# SSCAP API: Development & Decision Log

This document summarizes the development journey of the SSCAP API to provide context for future maintenance or reconstruction.

## Project Goal
Implement a Next.js API to receive sensor data from SSCAP systems (Flowmeter, Rain Gauge, Water Level) and store it in a serverless environment (Vercel).

## Technical Journey & Pivots

### 1. Storage Choice (KV vs. Blob)
- **Initial Idea**: Use **Vercel KV (Redis)**.
- **Pivot**: Switched to **Vercel Blob** because it offers a more generous free tier (250MB storage vs. 32MB for KV) and is better suited for storing JSON records as individual snapshots.

### 2. Vercel Blob Access (Private vs. Public)
- **Problem**: We initially tried using "Private" storage for maximum security.
- **Blocker**: The `@vercel/blob` SDK in the current Next.js environment had TypeScript conflicts with `access: 'private'` and required a more complex setup for individual file retrieval.
- **Solution**: Moved to a **Public** Blob store. Security is maintained by:
  - Using long, random UUIDs in filenames.
  - Ensuring "List" operations are only possible via the secret `BLOB_READ_WRITE_TOKEN`.
  - Adding a custom `/api/download` route that we control.

### 3. Caching Gotchas
- **Problem**: Next.js 14 cached the download endpoint, showing stale data.
- **Fix**: Added `export const dynamic = 'force-dynamic'` and `cache: 'no-store'` to the download route to ensure the absolute latest records are always fetched from the store.

## Current Data Structure
Stored records are JSON files with this structure:
- **`data`**: The raw sensor input (preserved **exactly** as posted, no date conversion).
  - **`tlaloque_id`**: String (Unique sensor/device ID)
  - **`pulses`** (utilizado): **Long Int** (Handled as 64-bit float, safe up to $2^{53}-1$)
  - **`pulses`** (captado): **Int** (Standard integer)
  - **`meters`** (nivel): **Float** (Double-precision decimal)
  - **`used_at`** / **`catched_at`**: String (Raw date string, e.g., "2024-03-20 15:00:00")
- **`metadata`**: Captured origin info (IP, Location, User-Agent) captured by Vercel.
- **`id`**: Unique record UUID.
- **`timestamps`**: Created/Updated ISO strings (system-generated).

## Filename Uniqueness & Integrity
To prevent data collisions (overwriting records), the system uses a multi-layered naming strategy:
- **Format**: `sscap/[type]/[Timestamp]-[UUID].json`
- **UUID v4**: Every record gets a 122-bit random identifier (`crypto.randomUUID()`). The probability of a collision is 1 in $10^{36}$, making it statistically impossible for two records to clash.
- **Timestamp Layer**: Filenames include an ISO timestamp down to the millisecond. Even if two requests were sent at the exact same time, they would still have unique UUIDs.
- **Result**: Records are effectively indexed by time and unique ID without the need for a central database.

### 4. Timezone & Date Normalization (Analysis Layer)
- **Challenge**: Some sensors send `catched_at` or `used_at` as plain text strings (e.g., "2024-03-20 10:00:00") without timezone information. Others use ISO 8601 UTC.
- **Strategy**: 
  - Instead of forcing the API to transform data (keeping it "Impact-Free" for Vercel), we handle normalization in the analysis notebook.
  - **IP-Based Timezone Discovery**: The notebook geocodes the upload IP to find the device's local timezone (e.g., `America/Mexico_City`).
  - **Smart Parsing**: If a date lacks a 'T' separator and timezone indicator, we assume it's local time and convert it to UTC using the discovered timezone.
  - **Transparency**: A flag `is_local_text_conversion` is added to the data for traceability.
