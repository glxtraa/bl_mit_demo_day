# Daily Log -> IPFS -> Blockchain -> Verified Analysis

This pipeline stores daily rainfall logs as tamper-evident records:

1. Aggregate raw log into canonical daily JSON
2. Compute integrity fields (`content_sha256`, `merkle_root`)
3. Pin JSON to IPFS
4. Anchor CID + hashes on blockchain
5. Read from IPFS and verify against on-chain data before analysis

## Files

- Contract: `contracts/DailyLogAnchor.sol`
- Prepare daily JSON: `scripts/prepare-daily-log.mjs`
- Pin to IPFS (Pinata): `scripts/ipfs-pin-daily.mjs`
- Anchor on chain: `scripts/anchor-daily-onchain.mjs`
- Verify + analyze from IPFS: `scripts/verify-analyze-from-ipfs.mjs`

## Environment

Copy `.env.example` to `.env` and fill:

- `PINATA_JWT` (for pinning JSON to IPFS)
- `RPC_URL` (EVM RPC endpoint)
- `PRIVATE_KEY` (owner key for anchoring tx)
- `DAILY_ANCHOR_ADDRESS` (deployed `DailyLogAnchor` address)

## 1) Prepare daily file

```bash
npm run logs:prepare -- --input data/2026-03-02.log --date 2026-03-02 --output data/daily/2026-03-02.daily.json
```

Output includes:

- `entries` (deduplicated)
- `aggregates.by_tlaloque_id`
- `integrity.content_sha256`
- `integrity.merkle_root`

## 2) Pin daily JSON to IPFS

```bash
PINATA_JWT=... npm run ipfs:pin -- --input data/daily/2026-03-02.daily.json
```

Writes receipt: `data/daily/2026-03-02.daily.ipfs.json`

## 3) Anchor on blockchain

```bash
RPC_URL=... PRIVATE_KEY=... DAILY_ANCHOR_ADDRESS=... npm run chain:anchor -- --input data/daily/2026-03-02.daily.json --cid <CID_FROM_PINATA>
```

Writes receipt: `data/daily/2026-03-02.daily.anchor.json`

## 4) Verify + analyze from IPFS

```bash
RPC_URL=... DAILY_ANCHOR_ADDRESS=... npm run chain:verify-analyze -- --date 2026-03-02
```

What it verifies:

- On-chain `dataHash` == SHA-256 of canonical daily payload (excluding `integrity`)
- On-chain `merkleRoot` == recomputed merkle root from `entries`
- On-chain `entryCount` == payload `entry_count`

Only after this verification it runs analysis summaries.

## Tamper resistance model

- If IPFS JSON is modified, recomputed hashes won’t match on-chain.
- If someone serves wrong CID content, verification fails.
- Blockchain stores immutable anchor (CID + hashes + count + timestamp).

## Current assumption

Server creates one aggregated file per day (`YYYY-MM-DD.daily.json`).
