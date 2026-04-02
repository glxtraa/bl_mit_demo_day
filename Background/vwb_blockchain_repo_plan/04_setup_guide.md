# Setup Guide & Required Credentials

This document outlines the environmental configuration required for the standalone blockchain repository to function. 

## Node Environment Setup
The repository will likely use Node.js to power the scripts that fetch data from Vercel and interact with Arweave and Base.

Required Libraries:
- `ethers` (For Base interaction and wallet handling)
- `@ethereum-attestation-service/eas-sdk` (For creating EAS Attestations)
- `@irys/sdk` (For cheap, permanent storage of raw data)
- `axios` (For fetching the daily JSON records from the Vercel API)

---

## 2. Environment Variables (`.env`)

The Standalone Repo must hold the following strictly secret variables to act as the Oracle/Attester.

### Vercel Access
- **`SSCAP_API_URL`**: `https://your-vercel-deployment.vercel.app`
- **`BLOB_READ_WRITE_TOKEN`** *(Optional)*: If you require a token to use the `/api/download` endpoint securely instead of leaving it fully public.

### Blockchain Interaction (Base L2)
- **`BASE_RPC_URL`**: A provider endpoint connecting you to the Base network. (e.g., `https://mainnet.base.org` or a dedicated node URL from Alchemy, QuickNode, or Infura).
- **`ATTESTER_PRIVATE_KEY`**: The private key of the Ethereum wallet that signs exactly what data is true. 
  - *Security Warning*: This is the most critical key in your system. If this is compromised, the attacker can mint fake VWB tokens by signing false attestations. It should never be exposed on the frontend.
  - *Funding*: This wallet must hold a small amount of Base ETH to pay gas fees for the daily EAS transactions (~$5 is plenty).

### Decentralized Storage (Arweave via Irys)
- **`IRYS_FUNDING_KEY`**: A private key used by the Irys SDK to pay for storage. You can fund this wallet with MATIC on Polygon to pay for Arweave storage extremely cheaply.

### Schema Identification
- **`EAS_TIER1_ANCHOR_SCHEMA_UID`**: The 32-byte ID of the schema used for daily raw data anchoring.
- **`EAS_TIER2_VWB_SCHEMA_UID`**: The 32-byte ID of the schema used for the quarterly VWB token minting.
- **`VWB_CONTRACT_ADDRESS`**: The deployed address of your ERC-20 token contract on Base.

---

## 3. Operational Workflow
1. Clone the standalone repository.
2. Define the `.env` file using the keys above.
3. Configure a Cron job (like GitHub Actions `.github/workflows/daily-anchor.yml`) to run the `scripts/daily_anchor.js` script exactly once every 24 hours.
4. Manually run (or schedule) `scripts/quarterly_oracle.js` four times a year to execute the VWB logic and trigger the token mints.
