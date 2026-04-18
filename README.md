# CampusSwap Frontend

CampusSwap is a Next.js 14 frontend for the Sepolia deployment described in `CampusSwap_前后端协作说明_v1.2.docx`. It keeps the dark green dashboard language from the supplied UI prototype and follows the Solidity contracts in `Contracts/`.

## Stack

- Next.js 14 App Router
- TypeScript
- React
- Tailwind CSS
- RainbowKit + wagmi v2
- viem
- Supabase JS client

## Routes

- `/`
- `/profile`
- `/submit`
- `/verifier`
- `/verifier/[id]`
- `/swap`
- `/rewards`
- `/my-redemptions`
- `/governance`
- `/verifier-pool`

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Required:

- `NEXT_PUBLIC_CHAIN_ID`
- `NEXT_PUBLIC_SEPOLIA_RPC`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `PINATA_JWT`

Optional backend variable if you add privileged scripts:

- `SUPABASE_SERVICE_KEY`

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Notes

- Contract addresses are centralized in `contracts/sepolia.json`.
- ABI files are stored in `contracts/abis/`.
- Profile-gated pages follow the Word document:
  - `/submit`
  - `/rewards`
  - `/verifier-pool`
- `submitTask` is wired as `submitTask(actionType, proofCID, 5)`.
- Transaction success states rely on confirmed receipts, not raw tx hashes.
- GT and RT are displayed as integer tokens because both contracts use `decimals() = 0`.
