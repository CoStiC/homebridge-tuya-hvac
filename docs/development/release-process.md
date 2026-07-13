# Release process

The first public version is published under the npm `beta` dist-tag. The package `publishConfig` pins the public registry, public access and `beta` tag so an unqualified `npm publish` cannot update `latest` accidentally.

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
- `LICENSE`;
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

Before publication, verify all of the following:

- verify the final package name, repository URL and support metadata;
- verify that the Node.js 22 and 24 GitHub Actions jobs pass on the release commit;
- approve the changelog and public version;
- complete the beta publication checklist in Notion.

Authenticate without displaying or storing a token in the repository, then publish with the explicit tag as a second safeguard:

```bash
npm publish --tag beta
```

Verify the published metadata and installation:

```bash
npm view homebridge-tuya-hvac@beta
npm install homebridge-tuya-hvac@beta
```

If version 0.1.0 is accepted unchanged as the stable release, promote the existing artifact instead of publishing the same version again:

```bash
npm dist-tag add homebridge-tuya-hvac@0.1.0 latest
```
