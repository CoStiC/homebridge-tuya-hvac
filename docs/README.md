# Homebridge Tuya HVAC — Documentation

This directory is the technical and operational Knowledge Base distributed with the project.

## User guide

- [Installation and Tuya credential retrieval](installation.md)

## Architecture

- [Reference architecture](architecture/architecture.md)
- [Layer boundaries](architecture/layers.md)
- [HomeKit mapping](architecture/homekit.md)
- [Confirmed transactions](architecture/transactions.md)

## Decisions

- [ADR index](adr/ADR.md)
- [Layered architecture](adr/ADR-001-layered-architecture.md)
- [Confirmed writes](adr/ADR-002-confirmed-write.md)
- [Command serialization](adr/ADR-003-command-serialization.md)

## Tuya reference

- [LAN protocol](tuya/protocol.md)
- [Validated Data Points](tuya/datapoints.md)
- [IVW Inverter 10 profile](tuya/ivw-inverter-10.md)

## Development

- [Contributing](CONTRIBUTING.md)
- [Testing](development/testing.md)
- [Roadmap](development/roadmap.md)
- [Release process](development/release-process.md)
- [Changelog](CHANGELOG.md)

## Source-of-truth policy

Git contains stable technical knowledge needed by developers and operators. Notion contains project management, work in progress, experiment logs and real-device test tracking. Only validated results with lasting technical value are promoted from Notion into this directory.
