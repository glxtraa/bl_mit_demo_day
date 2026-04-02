# Data Pipeline: Tier 1 Auditable Anchoring

This document details how the standalone repository handles the daily ingestion and permanent anchoring of raw SSCAP sensor data.

## 1. Fetching the Data
The script runs locally or via a cron job (e.g., GitHub Actions) without impacting Vercel's write operations.

1. **Endpoint**: `GET https://[YOUR_VERCEL_URL]/api/download`
2. **Filtering**: The response is a flat array of all records. The script must filter down to only the records created in the last 24 hours. (Using the `created_at` or `uploadedAt` fields).

## 2. Batching into Arweave (Irys)
Storing thousands of JSONs independently on Arweave is cheap, but bundling them into a single file is even cheaper and dramatically easier to audit.

1. **Format**: The script reduces the daily records into a single JSON Array file (e.g., `sscap_raw_2026_03_27.json`).
2. **Upload**: Use the **Irys SDK** (formerly Bundlr) to upload the file to Arweave.
    ```javascript
    // Conceptual Example
    const Irys = require("@irys/sdk");
    const irys = new Irys({ url: "node1", token: "matic", key: process.env.IRYS_KEY });
    const receipt = await irys.uploadFile("./sscap_raw_2026_03_27.json");
    const arweaveUrl = `https://arweave.net/${receipt.id}`;
    ```

## 3. The Base EAS Attestation (Anchoring)
Once the data is securely on Arweave, the script tells the Base blockchain that this data exists and is official.

1. **EAS Schema Setup**:
   - You must pre-register a schema on Base EAS (e.g., `RawDataAnchor(string date, string arweaveUrl, uint256 recordCount)`).
2. **The Transaction**:
   - The script uses the `EAS SDK` to sign an attestation from the official project wallet.
   - Example payload: 
     - `date`: "2026-03-27"
     - `arweaveUrl`: "https://arweave.net/ABC123XYZ..."
     - `recordCount`: 1440
   - The transaction goes to Base L2, costing roughly $0.005 USD in ETH.

## 4. End Result of Tier 1
At the end of every day, anyone in the world can view the Base L2 blockchain, see the EAS attestation from your official wallet, click the Arweave link, and download the exact, untampered raw readings (including `tlaloque_id` and raw strings) from that day.
