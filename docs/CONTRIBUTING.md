# Contributing

> **Project:** Homebridge Tuya HVAC
>
> **Status:** Reference documentation
>
> This document defines the project's development principles and contribution guidelines.
>
> It describes _how_ the project should evolve rather than _how_ to use GitHub.

---

# Philosophy

The project prioritizes:

- software quality;
- maintainability;
- readability;
- robustness;
- simplicity.

Long-term maintainability always takes precedence over short-term convenience.

---

# Development Workflow

Every significant feature follows the same workflow:

1. Understand the problem.
2. Design the solution.
3. Validate the architecture.
4. Implement.
5. Test.
6. Document.

Implementation is never the first step.

---

# Architecture First

All developments must comply with the [reference architecture](architecture/architecture.md).

In particular:

- one responsibility per component;
- clear separation of concerns;
- infrastructure isolated from the business domain;
- protocol-specific code confined to the communication layer.

---

# Business Domain

The business domain models HVAC concepts only.

It must never depend on:

- Tuya;
- Homebridge;
- HomeKit;
- TinyTuya.

Examples of valid business concepts:

- HvacController
- HvacState
- HvacGateway
- HvacMode

---

# Communication Layer

The communication layer is responsible for:

- Data Point mapping;
- protocol implementation;
- network communication;
- protocol-specific errors.

Only this layer may manipulate Tuya Data Points.

---

# HomeKit Layer

HomeKit acts as an adapter.

Responsibilities:

- expose HomeKit characteristics;
- receive HomeKit commands;
- synchronize state.

No business logic belongs here.

---

# Documentation

The `docs` directory constitutes the project's Knowledge Base.

Documentation evolves only when:

- a discovery has been experimentally validated;
- an architectural decision has been made;
- the reference architecture changes.

Ideas, experiments and ongoing work belong to the Notion workspace.

---

# Reverse Engineering

Every protocol behavior must be experimentally validated.

Vendor documentation alone is never considered sufficient evidence.

Validated discoveries are documented under [`tuya/`](tuya/).

---

# Architecture Decisions

Significant architectural decisions are documented under [`adr/`](adr/).

Examples include:

- new abstractions;
- architectural changes;
- technology choices;
- dependency changes.

---

# Coding Style

Prefer:

- small classes;
- small methods;
- explicit names;
- immutable data where appropriate;
- composition over inheritance.

Avoid clever code.

Code should always favor readability.

---

# TypeScript

The project uses strict TypeScript.

Goals:

- strong typing;
- explicit interfaces;
- minimal use of `any`;
- clear business models.

---

# Dependencies

Before introducing a new dependency, evaluate:

- necessity;
- maturity;
- maintenance;
- long-term impact.

Dependencies should remain limited.

---

# Testing

Every important feature should be validated.

Whenever possible:

- isolate the problem;
- reproduce it;
- understand it;
- then fix it.

Quick fixes are discouraged.

---

# Communication

Technical discussions should prioritize:

- architecture diagrams;
- interfaces;
- responsibilities;
- rationale.

Large implementations should always be preceded by a design discussion.

---

# Project Evolution

The project evolves through validated knowledge.

The workflow is:

```text
Idea

↓

Discussion

↓

Experiment

↓

Validation

↓

Implementation

↓

Documentation
```

Knowledge becomes part of the Knowledge Base only after validation.

---

# Related Documentation

- [Architecture](architecture/architecture.md)
- [ADR index](adr/ADR.md)
- [Tuya reference](tuya/)
- [Roadmap](development/roadmap.md)
