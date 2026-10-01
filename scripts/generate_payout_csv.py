#!/usr/bin/env python3
"""
Seeds N "processor payout" transactions into the running ledger service via
its REST API, then writes a CSV that's supposed to represent what the
processor's own records say -- except it deliberately disagrees with the
internal ledger in each of the four ways the reconciliation worker detects:

  1. AMOUNT_MISMATCH   - one row's amount is off by a single cent
  2. MISSING_PROCESSOR - one internally-posted transaction is left out of the CSV
  3. MISSING_INTERNAL  - one CSV row references a payout we never posted
  4. DUPLICATE         - one CSV row is repeated verbatim

Stdlib only (urllib + csv) so there's nothing to pip install.

Usage:
    python scripts/generate_payout_csv.py [--base-url http://localhost:8080] [--count 10]

Then upload the CSV:
    curl -X POST localhost:8080/api/reconciliation/jobs -F "file=@payout.csv"

And poll:
    curl localhost:8080/api/reconciliation/jobs/<id>
"""
import argparse
import csv
import json
import random
import urllib.error
import urllib.request
import uuid

PROCESSOR_CLEARING_ACCOUNT_ID = 1
MERCHANT_PAYABLE_ACCOUNT_ID = 2


def post_transaction(base_url: str, idempotency_key: str, amount_cents: int) -> None:
    body = json.dumps({
        "idempotencyKey": idempotency_key,
        "description": "synthetic processor payout",
        "entries": [
            {"accountId": PROCESSOR_CLEARING_ACCOUNT_ID, "amountCents": -amount_cents},
            {"accountId": MERCHANT_PAYABLE_ACCOUNT_ID, "amountCents": amount_cents},
        ],
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{base_url}/api/transactions",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Failed to post {idempotency_key}: {e.code} {e.read().decode()}") from e


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--count", type=int, default=10, help="number of clean payouts to seed")
    parser.add_argument("--out", default="payout.csv")
    args = parser.parse_args()

    # 1. Seed N clean, matching payouts.
    posted = []
    for _ in range(args.count):
        ref = f"po_{uuid.uuid4().hex[:12]}"
        amount = random.randint(500, 500_00)  # $5.00 - $500.00
        post_transaction(args.base_url, ref, amount)
        posted.append((ref, amount))
        print(f"posted  {ref}  {amount} cents")

    # 2. Build the CSV rows, starting as an exact mirror of what we posted...
    csv_rows = list(posted)

    # ...then inject the four intentional mismatches.

    # (a) AMOUNT_MISMATCH: nudge one row's amount by 1 cent.
    ref, amount = csv_rows[0]
    csv_rows[0] = (ref, amount + 1)
    print(f"[inject] AMOUNT_MISMATCH  {ref}: internal={amount} vs csv={amount + 1}")

    # (b) MISSING_PROCESSOR: drop one row entirely -- we posted it, CSV omits it.
    dropped_ref, dropped_amount = csv_rows.pop()
    print(f"[inject] MISSING_PROCESSOR  {dropped_ref} ({dropped_amount} cents) -- posted internally, absent from CSV")

    # (c) MISSING_INTERNAL: add a row for a payout that was never posted.
    phantom_ref = f"po_{uuid.uuid4().hex[:12]}"
    phantom_amount = random.randint(500, 500_00)
    csv_rows.append((phantom_ref, phantom_amount))
    print(f"[inject] MISSING_INTERNAL  {phantom_ref} ({phantom_amount} cents) -- in CSV, never posted internally")

    # (d) DUPLICATE: repeat one row verbatim.
    dup_ref, dup_amount = csv_rows[1]
    csv_rows.append((dup_ref, dup_amount))
    print(f"[inject] DUPLICATE  {dup_ref} appears twice in the CSV")

    with open(args.out, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["processor_ref", "amount_cents"])
        writer.writerows(csv_rows)

    print(f"\nWrote {len(csv_rows)} rows to {args.out}")
    print("Expected mismatches: 1 AMOUNT_MISMATCH, 1 MISSING_PROCESSOR, 1 MISSING_INTERNAL, 1 DUPLICATE")
    print(f"\nUpload with:\n  curl -X POST {args.base_url}/api/reconciliation/jobs -F \"file=@{args.out}\"")


if __name__ == "__main__":
    main()
