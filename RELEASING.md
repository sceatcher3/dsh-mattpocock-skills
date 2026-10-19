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

The repository is currently private. Make it public before advertising the Git install path, or keep it private and rely on the npm package.

## 4. Versioning

Bump `version`, update `skills/index.json` if the skill set changed (`npm run manifest`), commit, then `git tag vX.Y.Z` and publish. Upstream resync uses `node tools/sync-from-checkout.mjs <upstream-checkout>`.
