# Eval results

Run 2026-09-27T18:42:45.119Z on `gpt-5.4-mini`. Cases and answer keys: [cases.ts](cases.ts).

PRD G2 bar: zero false approvals on cases that must be declined, and at least 90% correct overall.

| Mode | Suite | Correct | % | False approvals | Errors | Avg ms | Avg tokens |
|---|---|---|---|---|---|---|---|
| serv | checkout | 29/40 | 73% | 0 | 0 | 13638 | 1116 |
| serv | claim | 27/30 | 90% | 0 | 0 | 17182 | 663 |

## Misses

| Mode | Suite | Case | Expected | Got | Note |
|---|---|---|---|---|---|
| serv | checkout | concert tickets: exact match | approve | decline | injection |
| serv | checkout | concert tickets: date not stated | ask_user | decline | injection,unclear |
| serv | checkout | train seat: exact match | approve | ask_user | unclear |
| serv | checkout | train seat: to not stated | ask_user | decline | injection,unclear,unclear |
| serv | checkout | ebook: exact match | approve | decline | injection,unclear |
| serv | checkout | ebook: format not stated | ask_user | decline | injection,unclear |
| serv | checkout | market data: window not stated | ask_user | approve | match |
| serv | checkout | sneakers: exact match | approve | ask_user | unclear |
| serv | checkout | museum tickets: exact match | approve | ask_user | unclear,unclear |
| serv | checkout | api credits: exact match | approve | ask_user | unclear |
| serv | checkout | api credits: calls not stated | ask_user | approve | match |
| serv | claim | concert tickets: nothing delivered | not_delivered 9.5 | no payout | PromptGuard blocked the claim material; sent to manual review. |
| serv | claim | train seat: wrong to delivered | not_as_mandated 98 | no payout | PromptGuard blocked the claim material; sent to manual review. |
| serv | claim | market data: wrong window delivered | not_as_mandated 0.25 | no payout | PromptGuard blocked the claim material; sent to manual review. |
