# SSCAP API Walkthrough

This guide provides instructions for setting up and testing the SSCAP API server on Vercel.

## Features
- **POST `/api/utilizado`**: Receives flowmeter data.
- **POST `/api/captado`**: Receives rain gauge pulses.
- **POST `/api/nivel`**: Receives water column height changes.

All endpoints validate the input and store the records in **Vercel Blob** as `.json` files. The records are organized into a clean structure:
- **`data`**: Your original sensor input (preserved **exactly** as posted).
  - `pulses`: **Long Int** (utilizado) / **Int** (captado)
  - `meters`: **Float** (nivel)
- **`metadata`**: Origin info (IP, City, Country, User-Agent) captured by Vercel.

### 3. Web Download
I added a **Download All Data** button directly on your Vercel home page (`/`). Clicking this will fetch all records from your Blob store and download them as a single JSON file.

## Setup Instructions

### 1. Vercel Deployment

1.  **Link to Vercel**: Run `vercel` in your terminal.
2.  **Connect Storage**: Go to the Vercel Dashboard, select your project, and create/connect a **Blob** store (Must be **Public**).
3.  **Deploy**: Run `vercel --prod` to deploy the latest changes.

### 2. Local Testing

You can use `curl` to test the production API directly:

**Flowmeter Test**
```bash
curl -X POST https://sscap-api.vercel.app/api/utilizado -H "Content-Type: application/json" -d '{
  "tlaloque_id": "848970e2-63b7-4475-8e7c-87d00f12c6a0",
  "pulses": 12,
  "used_at": "2024-03-20 10:00:00"
}'
```

**Rain Gauge Test**
```bash
curl -X POST https://sscap-api.vercel.app/api/captado -H "Content-Type: application/json" -d '{
  "tlaloque_id": "848970e2-63b7-4475-8e7c-87d00f12c6a0",
  "pulses": 12,
  "catched_at": "2024-03-20 10:00:00"
}'
```

**Water Level Test**
```bash
curl -X POST https://sscap-api.vercel.app/api/nivel -H "Content-Type: application/json" -d '{
  "tlaloque_id": "848970e2-63b7-4475-8e7c-87d00f12c6a0",
  "meters": 1.5,
  "catched_at": "2024-03-20 10:00:00"
}'
```

### 3. Database Verification

To download all recorded data locally:
1.  Run `vercel env pull` to get your `BLOB_READ_WRITE_TOKEN`.
2.  Run the backup script:
    ```bash
    node scripts/download_data.js
    ```
    This will create `data_backup.json` with all your records.

## 📊 Analysis with Google Colab

For advanced data analysis and visualization, a standalone Google Colab notebook is provided in the `analysis/` folder.

### Features:
- **Automatic IP Geocoding**: Visualizes sensor locations on an interactive map.
- **Smart Timezone Discovery**: Automatically detects the local timezone based on the device's IP address.
- **Advanced Date Parsing**: Automatically converts local date strings (e.g., "2024-03-20 10:00:00") to UTC, with a tracking column for transparency.
- **Time-Series Visualization**: Provides interactive charts for water levels and daily usage patterns.

### How to Use:
1.  Open [Google Colab](https://colab.research.google.com/).
2.  Upload the `analysis/SSCAP_Analysis.ipynb` file.
3.  Enter your deployed Vercel URL in the first cell.
4.  Run all cells to see your live data dashboard.
