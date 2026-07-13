# Confirmed transactions

Every mutation follows the same invariant:

```text
user intention
→ optional complete pre-read
→ Tuya write
→ explicit complete reads
→ requested value verified
→ confirmed HvacState returned
→ HomeKit applyState()
```

Writes are potentially ambiguous: a timeout does not prove that the device rejected the command. The gateway therefore treats the following complete read as the source of truth.

## Completeness

A response must contain DP1, DP2, DP3 and DP4 before it can be mapped to `HvacState`. Partial responses are never merged into or accepted as complete state.

## Bounded confirmation

The current strategy uses at most two idempotent writes and five reads per write, separated by 500 ms after the first read. These bounds were introduced after real DP1 failures and validated end to end for DP1, DP2 and DP4.

## Serialization

Transactions for one device are serialized by `TuyaHvacGateway`; reads and writes do not overlap. HomeKit background workers may accept newer intentions while a transaction is running, but only the latest pending intention for power, mode or the shared target temperature is retained.
