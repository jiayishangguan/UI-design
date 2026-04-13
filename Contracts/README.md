# Contracts

This folder is for smart contract files of backend.

## Architecture

| Contract | Purpose |
|----------|---------|
| `CommitteeManager.sol` | Unified governance: multi-sig proposals (2/3 threshold) |
| `WhitelistRegistry.sol` | MVP verifier registry (delegates to CommitteeManager) |
| `GreenToken.sol` | ERC-20 reward for verified green actions + tier system |
| `RewardToken.sol` | ERC-20 for campus reward redemption (burnable) |
| `AMMPool.sol` | Constant product AMM (x·y=k) with dynamic fees |
| `ActivityVerification.sol` | Submit → vote → auto-mint GT (self-vote blocked) |
| `RewardRedemption.sol` | Burn RT to redeem rewards (dynamic pricing) |
