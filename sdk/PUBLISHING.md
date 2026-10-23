# Publishing the SDKs

All five SDKs are published from `.github/workflows/publish-sdks.yml` with
`workflow_dispatch`. The workflow validates the version, rebuilds the package,
and then publishes to the matching registry.

## One-time setup

### npm

1. Create (or join) the `@airpay` organization on npm.
2. Create a granular access token with **Read and write** permission for the
   `@airpay` scope and add it as the `NPM_TOKEN` repository secret.

### PyPI

1. Create a PyPI account and reserve the `airpay` project name.
2. Either:
   - create an API token for the `airpay` project and add it as
     `PYPI_API_TOKEN`, or
   - switch the workflow step to
     `pypa/gh-action-pypi-publish` and configure a pending trusted publisher
     for this repository and workflow (`publish-sdks.yml`).

### Go

No registry upload is needed. The workflow pushes a `sdk/go/v<version>` tag,
which makes the module available to the Go module proxy.

### PHP

Packagist cannot read a `composer.json` in a monorepo subdirectory, so the
workflow splits `sdk/php` into its own repository.

1. Create an empty public repository `arindam923/airpay-php`.
2. Create a personal access token with `repo` scope and add it as the
   `SDK_SPLIT_TOKEN` secret. It is used only to push the split package.
3. Submit `https://github.com/arindam923/airpay-php` once at
   `https://packagist.org/packages/submit`.
4. Optional: set the `PACKAGIST_USERNAME` repository variable and the
   `PACKAGIST_API_TOKEN` secret. The workflow then triggers a Packagist update
   immediately; otherwise Packagist's GitHub webhook handles it.

If the split repository has a different name, set the
`PHP_SPLIT_REPOSITORY` repository variable to `owner/repo`.

## Secrets and variables

| Name | Kind | Purpose |
| --- | --- | --- |
| `NPM_TOKEN` | secret | Publish `@airpay/sdk` and `@airpay/js` |
| `PYPI_API_TOKEN` | secret | Publish `airpay` on PyPI |
| `SDK_SPLIT_TOKEN` | secret | Push the PHP package to `airpay-php` |
| `PACKAGIST_API_TOKEN` | secret | Trigger a Packagist update (optional) |
| `PACKAGIST_USERNAME` | variable | Packagist account name (optional) |
| `PHP_SPLIT_REPOSITORY` | variable | PHP split repo, defaults to `arindam923/airpay-php` |

## Release steps

1. Bump the version in the relevant manifest(s):
   - `sdk/typescript/package.json`, `sdk/typescript/src/index.ts`
   - `sdk/js/package.json`, `sdk/js/src/index.ts`
   - `sdk/python/pyproject.toml`, `sdk/python/airpay/__init__.py`
2. Commit and merge the version bump.
3. Run **Actions → Publish SDKs → Run workflow** with `dry_run: true` and
   inspect the build output.
4. Run it again with the same `sdk` and `version` but `dry_run: false` to
   publish.
   - `sdk`: `typescript`, `js`, `python`, `php`, `go`, or `all`
   - `version`: the exact version without a leading `v` (for example `0.1.0`)

Go and PHP are versioned by git tags created by the workflow. npm and PyPI
reject duplicate versions, so bump the manifest before every release.

## Local checks

```bash
# TypeScript / JS
cd sdk/typescript && npm install && npm run build && npm pack --dry-run
cd ../js && npm install && npm run build && npm pack --dry-run

# Python
cd sdk/python && python -m build && python -m twine check dist/*

# Go
cd sdk/go && go test ./...

# PHP
cd sdk/php
composer validate --strict
composer update
composer test
```
