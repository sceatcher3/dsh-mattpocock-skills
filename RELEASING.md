# Releasing

The package is publish-ready: `private` is removed, `publishConfig.access` is `public`, and `npm pack` produces the complete bundle (64 files, 27 skills).

## 1. Publish to npm

```sh
npm login                      # or: export NPM_TOKEN=... and add //registry.npmjs.org/:_authToken=${NPM_TOKEN} to .npmrc
npm publish --access public
npm view dsh-mattpocock-skills-bundle version
```

Publishing under a scope instead (for example `@sceatcher3/dsh-mattpocock-skills-bundle`) only needs the `name` field changed in `package.json`; `--access public` is still required.

## 2. Verify the install path users will take

```sh
dsh plugin --profile web add dsh-mattpocock-skills-bundle
```

The plugin manager installs the package, selects its `dsh.bundle.patch`, and the row appears as `dsh-mattpocock-skills-bundle`. Open `/tdd` in the composer or call `skill({ name: "tdd" })` to confirm.

## 3. Push the repository

```sh
git push origin main --tags
```

The repository is public, so the Git and release-tarball install paths need no credentials.

## 4. Versioning

Bump `version`, update `skills/index.json` if the skill set changed (`npm run manifest`), commit, then `git tag vX.Y.Z` and publish. Upstream resync uses `node tools/sync-from-checkout.mjs <upstream-checkout>`.

## Alternative: GitHub Packages (no npmjs account)

If npmjs registration is unavailable, publish the same tarball to GitHub Packages under a scoped name.

1. Set `name` to `@sceatcher3/dsh-mattpocock-skills-bundle` and add `"publishConfig": { "registry": "https://npm.pkg.github.com" }`.
2. Publish with a token that has `write:packages`:

```sh
npm publish --registry=https://npm.pkg.github.com
```

3. Installers need a `.npmrc` with their own GitHub token, because GitHub Packages requires authentication even for public packages:

```
@sceatcher3:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<their-token>
```

```sh
dsh plugin --profile web add @sceatcher3/dsh-mattpocock-skills-bundle
```

This is the closest path to `add <name>`, at the cost of every installer needing a GitHub token.

## Alternative: release tarball

Upload the `npm pack` output as a GitHub Release asset and install it by URL:

```sh
dsh plugin --profile web add https://github.com/sceatcher3/dsh-mattpocock-skills/releases/download/v0.2.0/dsh-mattpocock-skills-bundle-0.2.0.tgz
```

No registry account is involved; the repository must be public.
