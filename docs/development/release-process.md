# Release process

The project is not yet published to npm. Until a public licence and publication policy are selected, releases are validated as local npm tarballs only.

## Prerequisites

- use a clean Git worktree;
- use a supported Node.js version (22 or 24);
- ensure the intended version is set in `package.json` and `package-lock.json`;
- never include or inspect local Homebridge configuration, credentials or development storage.

## Validate the source tree

```bash
npm ci
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
```

Protocol-facing changes must also have a documented real-device validation result in Notion before packaging.

## Build the local tarball

```bash
npm pack
```

The `prepack` script rebuilds `dist/`. Inspect the npm file listing and verify that the package contains only:

- `dist/`;
- `config.schema.json`;
- `package.json`;
- the root `README.md`.

The tarball must not contain source files, tests, development scripts, internal agent instructions, local Homebridge storage or secrets.

## Test local installation

Install the generated tarball in an isolated temporary project before installing it in the development Homebridge environment:

```bash
mkdir /tmp/homebridge-tuya-hvac-package-test
cd /tmp/homebridge-tuya-hvac-package-test
npm init --yes
npm install /path/to/homebridge-tuya-hvac-0.1.0.tgz
```

Verify that npm resolves the runtime dependency and that the compiled plugin entry point can be loaded.

Delete the generated tarball after validation. Do not commit it.

## Public beta publication

Public npm publication remains blocked until all of the following are explicitly decided and completed:

- choose and add a licence;
- remove `private: true` intentionally;
- verify the final package name, repository URL and support metadata;
- add and validate the minimal GitHub CI workflow;
- approve the changelog and public version;
- complete the beta publication checklist in Notion.
