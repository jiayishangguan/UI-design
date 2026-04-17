# Frontend Code

This folder contains a minimal runnable frontend for CampusSwap.

## Run

Use any local static file server from the repository root so the frontend can load local ABI files from `artifacts/`.

Example:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/Frontend/code/
```

## Notes

- The frontend only reads ABI files from existing Hardhat artifacts.
- Contract addresses are configured in `Frontend/code/config.js`.
- No backend, contract, script, or test files are modified by this frontend.
..