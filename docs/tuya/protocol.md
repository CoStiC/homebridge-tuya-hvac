# Tuya LAN protocol

Runtime communication is local-only and uses TuyAPI 7.7.1 with protocol version 3.5.

The Tuya Cloud is not a runtime dependency. It may be used during setup or investigation to retrieve a Local Key, discover a device or compare metadata.

## Operational behavior

- A TuyAPI write may time out even when its outcome is ambiguous.
- Device state must be confirmed by an explicit read after every write.
- Some responses observed around writes are partial; they cannot produce `HvacState`.
- Disconnecting immediately from an unawaited fire-and-forget write can interrupt the actual send. Writes therefore retain TuyAPI's awaited response behavior and are followed by independent confirmation reads.

See [confirmed transactions](../architecture/transactions.md) for the gateway algorithm.
