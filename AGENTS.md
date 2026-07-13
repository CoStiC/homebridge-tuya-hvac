# AGENTS.md — Homebridge Tuya HVAC

## Purpose

This repository contains a Homebridge plugin for controlling Tuya-compatible HVAC devices locally over the LAN.

The first supported device is an **IVW Inverter 10 swimming-pool heat pump**, but the code must remain adaptable to other Tuya-compatible HVAC devices without introducing premature abstractions.

The project prioritizes correctness, maintainability, readability, testability, local-only runtime operation, incremental delivery, and explicit architectural boundaries.

Do not optimize for speed of implementation at the expense of design quality.

## Source of truth

Before making architectural or functional changes, read the relevant project documentation:

- `docs/README.md`
- `docs/architecture/architecture.md`
- `docs/architecture/layers.md`
- `docs/architecture/homekit.md`
- `docs/architecture/transactions.md`
- `docs/adr/`
- `docs/tuya/`
- `docs/development/`
- `docs/CONTRIBUTING.md`
- `docs/CHANGELOG.md`

Validated experimental behavior takes precedence over vendor documentation.

Git documentation is the durable technical and operational source of truth for developers who clone the repository. It includes architecture, accepted ADRs, validated Tuya protocol knowledge, developer guides, testing guidance and the changelog.

Notion is the project-management workspace for backlog, milestones, roadmap, meeting notes, experiments in progress, real-device test tracking and project organization.

Only validated knowledge should be promoted to the repository documentation.

## Architecture

Preserve this dependency direction:

```text
HomeKit
  ↓
HeaterCoolerAccessory
  ↓
HvacController
  ↓
HvacGateway
  ↓
TuyaHvacGateway
  ↓
TuyaClient
  ↓
Tuya LAN device
```

### HomeKit adapter

Location: `src/homekit/`

Responsibilities:

- expose HomeKit services and characteristics;
- translate HomeKit interactions into domain operations;
- reflect confirmed `HvacState` values into HomeKit;
- report command failures to HomeKit.

Forbidden:

- direct Tuya calls;
- direct Data Point manipulation;
- protocol-specific values;
- business rules that belong in the controller.

### Application layer

Location: `src/application/`

Responsibilities:

- orchestrate HVAC use cases;
- coordinate gateway calls;
- apply domain-level rules;
- return confirmed domain state.

The controller must remain independent from HomeKit and Tuya.

### Domain layer

Location: `src/domain/`

Responsibilities:

- define HVAC concepts;
- define gateway contracts;
- define state and modes.

The domain must never import Homebridge, HomeKit, TuyAPI, TinyTuya, Tuya-specific types, or Data Points.

### Tuya infrastructure

Location: `src/tuya/`

Responsibilities:

- LAN communication;
- protocol handling;
- Data Point mapping;
- vendor-specific values;
- response validation;
- confirmed reads and writes.

Only this layer may know Tuya Data Points.

## Core domain model

Keep power, mode and target temperature independent.

```ts
interface HvacState {
  active: boolean;
  currentTemperature: number;
  targetTemperature: number;
  mode: HvacMode;
}
```

Do not model ON or OFF as HVAC modes.

Expected domain concepts include:

```ts
getState(): Promise<HvacState>;
setActive(active: boolean): Promise<HvacState>;
setMode(mode: HvacMode): Promise<HvacState>;
setTargetTemperature(value: number): Promise<HvacState>;
```

Add methods only when required by a concrete increment.

## HomeKit decisions

The V1 uses a single native HomeKit `HeaterCooler` service.

| HomeKit characteristic        | Meaning                                    |
| ----------------------------- | ------------------------------------------ |
| `Active`                      | Independent ON/OFF                         |
| `CurrentTemperature`          | Current measured temperature               |
| `HeatingThresholdTemperature` | Heating setpoint                           |
| `CoolingThresholdTemperature` | Cooling setpoint                           |
| `TargetHeaterCoolerState`     | Requested AUTO / HEAT / COOL mode          |
| `CurrentHeaterCoolerState`    | Actual reported operating state when known |

The Home app exposes ON/OFF directly from the tile and exposes modes and target temperature separately in the accessory controls.

Therefore:

```text
ON  → setActive(true), mode unchanged
OFF → setActive(false), mode unchanged
```

Mode changes are independent:

```text
AUTO → setMode(Auto)
HEAT → setMode(Heat)
COOL → setMode(Cool)
```

Do not add a secondary Switch service unless a validated user need appears.

Do not let HomeKit presentation constraints leak into the domain.

`applyState()` should remain the single place that updates HomeKit characteristics from an `HvacState`.

Avoid optimistic state updates. After a command, use the state confirmed by the device.

## Validated IVW Inverter 10 facts

Protocol: `Tuya LAN 3.5`

Validated Data Points:

| DP  | Meaning             |
| --- | ------------------- |
| 1   | Power               |
| 2   | Target temperature  |
| 3   | Current temperature |
| 4   | Operating mode      |
| 13  | Unknown             |

Validated mode values:

| Domain meaning  | Tuya value   |
| --------------- | ------------ |
| Auto            | `auto`       |
| Heat            | `heat`       |
| Cool            | `cool`       |
| Boost heat      | `powerful_h` |
| Boost cool      | `powerful_c` |
| Silent/Eco heat | `silent_h`   |
| Silent/Eco cool | `silent_c`   |

Validated target temperature behavior:

```text
minimum: 8 °C
maximum: 32 °C
step: 1 °C
```

These facts belong in the IVW profile and must not be duplicated in HomeKit or the domain except through explicit capabilities/configuration when needed.

The current profile filename may refer to the IVW model for now. Rename it to a protocol/profile-oriented name only when another device is proven to share the same mapping.

## Tuya communication rules

Runtime operation must be LAN-only.

The Tuya Cloud may be used only for Local Key retrieval, discovery during setup, reverse engineering, and debugging.

Never add a runtime Cloud dependency.

Every write must follow this principle:

```text
write
→ explicit device read
→ verify the requested result
→ return confirmed HvacState
```

Do not trust fire-and-forget writes.

Do not accept partial Tuya responses as complete `HvacState` values.

If a write causes a partial response, obtain a complete status response before mapping it to `HvacState`.

Transactions for one device must not overlap. Serialize device operations when necessary.

Do not add retries, delays, queues or reconnect logic blindly. First reproduce and understand the failure, then implement the smallest justified mechanism and test it.

## Current implementation constraints

- TypeScript with strict typing.
- ESM modules.
- Node.js 22 or 24.
- Homebridge 2 compatible.
- `tuyapi` pinned to `7.7.1`.
- Single npm package.
- No monorepo.
- No multi-package split.
- No Cloud runtime.
- No premature device-profile framework.
- No unnecessary abstraction around every dependency.

Prefer simple explicit code over clever code.

## Change policy

Before modifying code:

1. inspect the current implementation;
2. inspect existing tests;
3. identify the smallest coherent change;
4. explain the intended change briefly;
5. modify only the required files.

Never assume that a requested method or test is absent. Search first.

Do not rewrite an entire file unless the user explicitly asks for the full file or a full replacement is safer than several ambiguous edits.

Avoid unrelated refactoring.

Do not change architecture during a bug fix unless the bug demonstrates an architectural flaw.

Call out regression risks explicitly.

## Testing

After every code change, run:

```bash
npm run format
npm run typecheck
npm run lint
npm test
npm run build
```

All five commands must pass before proposing a commit.

Tests should cover successful reads, failures and cleanup, successful confirmed writes, rejected unconfirmed writes, transaction serialization when relevant, mapping validation, and regression cases discovered on real hardware.

A passing unit test does not replace real-device validation when protocol behavior is involved.

Do not weaken tests merely to make them pass.

## Git policy

Before changing files:

```bash
git status --short
```

Do not commit automatically.

Do not amend, reset, rebase, force-push or delete branches without explicit user approval.

At the end of a task, show:

```bash
git diff --stat
git diff
```

Then propose a concise conventional commit message.

The user performs or explicitly authorizes commits.

## Secrets and local environment

Never read, print, copy, expose or commit secrets.

Sensitive files include:

```text
homebridge-dev/config.json
.env
.env.*
```

Never display Local Keys, Device IDs, HomeKit PINs, camera credentials, or other secrets.

The repository may run on a Debian VM accessed over SSH.

A production Homebridge instance may already be running on the same VM.

Development must use the isolated storage directory:

```text
homebridge-dev/
```

Do not stop, modify or interfere with the production Homebridge service unless explicitly requested.

The development bridge may require binding to the LAN interface because Docker interfaces can cause incorrect mDNS advertisements.

Do not change HomeKit bridge identity, cache or pairing state unless the task specifically requires it.

## Documentation and Notion

Documentation is a deliverable.

An increment is complete only when:

1. code is implemented;
2. checks are green;
3. real-device behavior is validated when applicable;
4. the user approves the result;
5. the commit is completed;
6. Notion is updated;
7. validated reference knowledge is promoted to `docs/` when appropriate.

Do not add unvalidated hypotheses to the Knowledge Base.

Use Notion for work in progress, experiment logs, bugs, implementation notes, milestone status and the development journal.

Use repository documentation for stable, validated knowledge.

When knowledge moves from Notion to Git documentation, preserve the distinction between observed facts, accepted decisions and implementation details. Do not copy transient project-management history into the technical Knowledge Base.

## Working style with the user

The user prefers direct progress over long speculative discussion.

Use this structure:

```text
problem
→ decision
→ files changed
→ validation
```

Avoid repeated restatements of project philosophy.

When manual edits are required, provide either a complete ready-to-replace file or a precise unified diff with unambiguous context.

Do not provide vague “insert this somewhere” instructions.

Ask for a file only when inspection is necessary and the repository cannot be read directly.

When operating through Codex, inspect and modify the repository directly rather than asking the user to relay file contents.

## Definition of done

A functional increment is done only when:

- behavior is implemented end-to-end;
- domain boundaries remain intact;
- all checks pass;
- real hardware confirms protocol behavior where relevant;
- HomeKit reflects confirmed state;
- no secret is exposed;
- regression risks are addressed;
- the change is committed after approval;
- Notion is updated.
