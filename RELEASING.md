# Releasing

The bundle ships through its public repository. Users install it by pasting the repository URL into DeepSeek Harness; there is no npm publish step and no release asset to upload.

## 1. Regenerate the manifest

```sh
npm run manifest
```

`tools/build-manifest.mjs` reads `i18n/zh.json` and stops if a shipped skill has no Chinese description or if the file names a skill that no longer ships. Commit the regenerated `skills/index.json` with the skill change.

## 2. Check and pack

Run the development workspace validator, then pack:

```sh
node ../.build/validate.mjs
npm pack --pack-destination ../.build
```

Install the packed tarball in a scratch profile and confirm all 27 skills load before tagging. The validator reports two executable-bit problems on the development workspace's FUSE mount; the Git index keeps mode `100755` on both shell helpers, so a fresh checkout is correct.

## 3. Version and push

Bump `version` in `package.json`, update the version named in the workspace README, commit, then:

```sh
git tag vX.Y.Z
git push origin main --tags
```

## 4. Verify the install path users take

```sh
dsh plugin --profile web add https://github.com/sceatcher3/dsh-mattpocock-skills
```

The plugin manager installs the repository, selects its `dsh.bundle.patch`, and the row appears as `dsh-mattpocock-skills`. Open `/tdd` in the composer or call `skill({ name: "tdd" })` to confirm. If the profile already has the bundle, remove it first:

```sh
dsh plugin --profile web remove dsh-mattpocock-skills-bundle
```

## Notes

- npm publishing is not used. The package is not on the npm registry, and the install documentation points only at the repository URL.
- `node tools/sync-from-checkout.mjs <upstream-checkout>` re-syncs skill folders and records the upstream commit; review the diff before tagging.
- The repository is public, so installs need no credentials.
