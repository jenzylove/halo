# Security

Halo runs on Base Sepolia with test USDC. It is a hackathon build, not audited for real money.

## Trust model

- **Agent wallets are Coinbase CDP server wallets.** Halo's server can sign for them so the agent can act without you. Link your own wallet as owner so refunds and withdrawals land with you.
- **Your Halo API key (`hk_…`) is delegated spending authority.** Whoever holds it can approve rules and spend the agent's balance within them. Keep it private.
- **The pool contract owner is an offline cold key.** Server keys can only act within the contract's rules (operator and relayer roles).
- **Full reserve.** Open protection never exceeds what the refund fund holds.
- **SERV cannot move money on its own.** Budgets, quantities, expiry, caps and reserve are enforced in code and in the contract.

Known limits and fixes are tracked in [docs/AUDIT.md](docs/AUDIT.md).

## Reporting

Please report vulnerabilities privately through GitHub security advisories on this repository, not in public issues.
