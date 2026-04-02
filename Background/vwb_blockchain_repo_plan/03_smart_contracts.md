# Smart Contracts and Tier 2 Oracle

This document outlines the Quarterly Oracle logic and the associated Smart Contracts on Base L2 that handle the Volumetric Water Benefit (VWB) token minting.

## 1. The Quarterly Oracle Script (Off-Chain)
To mint VWB tokens, complex business logic must be applied. This happens inside a Node.js/Python script in your standalone repository, not inside a Base smart contract.

**Timeline**: Runs four times a year (e.g., April 1st for Q1 data).

### Logic Flow:
1. **Fetch Anchored Data**: The script looks back at the 90 daily EAS attestations for the quarter and reads their corresponding Arweave JSON arrays.
    - *Why?* This proves to auditors that the oracle is calculating using the exact, untampered data from Tier 1.
2. **Apply Calculations**:
    - **`utilizado`**: Converts flowmeter pulses to Liters (e.g., $pulses \times 1.5$ liters/pulse).
    - **`captado`**: Converts rain gauge tips to Liters.
    - **`nivel`**: Converts meters to total tank volume based on the geometry mapped to that particular `tlaloque_id`.
3. **Geo-Aggregate**: Groups the total calculated Liters by geographic basin (e.g., matching the `tlaloque_id` to its basin in your database).
4. **Output**: A final sum of VWB Liters generated per basin for that quarter.

## 2. The Quarterly Base EAS Attestation
Once the oracle completes the math, it registers a final EAS Attestation on Base summarizing the result.

1. **EAS Schema**: `VwbQuarterlyMint(string basin, string quarter, uint256 totalLiters, string computationProofsUrl)`
   - *Example Payload*: `basin="Lerma-Chapala"`, `quarter="2026-Q1"`, `totalLiters=1500000`.
   - The `computationProofsUrl` links to a public CSV/JSON detailing the math applied to the raw Tier 1 data.
2. **The Signature**: This attestation is signed by your project's Official Wallet.

## 3. The VWB Token Smart Contract (Solidity)
You will deploy an ERC-20 (or ERC-1155) smart contract on Base. This contract listens to the Base network for your specific quarterly attestations.

### Core Functions:
1. **Listen & Mint**:
    - The contract has a function like `claimVWB(Attestation proof)`.
    - It checks if the `proof` comes from your Official Wallet address.
    - If valid, it reads the `totalLiters` from the attestation and automatically mints that exact amount of VWB Tokens.
2. **Decentralized Finance (DeFi)**:
    - Because the token is standard ERC-20 on Base, it can be instantly pooled with native USDC on generic decentralized exchanges (e.g., Uniswap v3) without any additional development.

## Why this approach?
Smart contracts cannot easily fetch data from Arweave, nor can they cheaply handle massive arrays and string manipulations (like converting pulses to liters for thousands of UUIDs). By keeping the heavy math off-chain inside the Oracle, but anchoring the result on-chain via the EAS signature, you achieve perfect "Web3" transparency with near-zero gas costs.
