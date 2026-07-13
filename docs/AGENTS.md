# AGENTS.md — Documentation scope

These instructions apply to every file under `docs/` in addition to the repository-level `AGENTS.md`.

## Purpose

The `docs/` directory is the durable technical and operational Knowledge Base shipped with the repository. A developer cloning the project must be able to understand the architecture, protocol mappings, accepted decisions, development workflow and validated behavior without access to Notion.

## Git documentation versus Notion

Store in Git:

- technical reference documentation;
- architecture and layer boundaries;
- accepted Architecture Decision Records;
- validated Tuya protocol and device-profile facts;
- developer, testing and release guides;
- changelog entries.

Store in Notion:

- backlog and milestones;
- project roadmap and organization;
- work in progress and hypotheses;
- experiment logs and real-device test reports;
- meeting notes and development journal.

Promote a Notion result into `docs/` only after it has been validated and has lasting technical value.

## Structure

- `README.md`: documentation index and source-of-truth map;
- `architecture/`: current architecture, boundaries, HomeKit mapping and transaction semantics;
- `adr/`: accepted or superseded architectural decisions;
- `tuya/`: validated LAN protocol, Data Point and device-profile knowledge;
- `development/`: contributor workflows, testing, roadmap and release guidance;
- `CHANGELOG.md`: user-visible changes by release or Unreleased increment.

## Writing rules

- Describe the current validated behavior, not speculative future designs.
- Label limitations and validation scope explicitly.
- Keep HomeKit concepts out of Tuya protocol documents and Data Points out of domain documentation.
- Link to the canonical document instead of duplicating the same fact across several files.
- Update examples when interfaces change.
- Use relative links matching the actual lowercase paths in this repository.
- Do not include secrets, device identifiers, Local Keys, HomeKit credentials or raw logs containing them.
- Do not fill placeholder documents with guesses. Leave them empty or mark their scope until validated content exists.

## Completion

A documentation change is complete when links and examples match the repository, formatting passes, and the corresponding code behavior has been validated at the level claimed by the document.
