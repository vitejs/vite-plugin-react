# Releasing @vitejs/plugin-rsc

`@vitejs/plugin-rsc` uses a pull-request-driven release flow. GitHub Actions prepares a release PR containing the version bump and changelog, and merging that PR triggers publishing. The other packages in this repository continue to use the existing tag-driven release flow.

## Prepare a Release

1. Run the [Prepare RSC Release](../../.github/workflows/prepare-rsc-release.yml) workflow from the `main` branch.
2. Select a `release` type. The default `next` creates the next patch for a stable version or advances an existing prerelease. Alternatively, select another supported release type or enter an exact `version`, which takes precedence over `release`.
3. Wait for `vite-release-bot` to open the release PR. The PR contains the `packages/plugin-rsc/package.json` version bump and generated `packages/plugin-rsc/CHANGELOG.md` entry.

To preview the available release types and versions locally, run the following command from the repository root and cancel before confirming so no files are changed:

```sh
node scripts/prepare-rsc-release.ts
```

## Review and Publish

1. Review the generated version and changelog, and wait for the release PR checks to pass.
2. Merge the PR while retaining the `release: plugin-rsc@<version>` commit subject. A matching commit at the tip of `main` triggers the RSC publish job.
3. Open the [Publish Package](../../.github/workflows/publish.yml) run and approve its `Release` environment deployment.
4. Wait for the workflow to publish the package, create the `plugin-rsc@<version>` tag, and create the corresponding GitHub release.
5. Verify the new version on npm and check that the tag and GitHub release point to the merged release commit.

## Repository Configuration

The release flow depends on configuration outside this repository:

- The `vite-release-bot` GitHub App must be installed only on `vitejs/vite-plugin-react` with Contents and Pull requests read/write permissions. Webhooks must be disabled.
- `RELEASE_GITHUB_APP_CLIENT_ID` must be a repository variable containing the app client ID.
- `RELEASE_GITHUB_APP_PRIVATE_KEY` must be a repository secret containing the app private key.
- The `Release` environment must require maintainer approval before publishing.
- The npm trusted publisher for `@vitejs/plugin-rsc` must be restricted to `vitejs/vite-plugin-react`, `.github/workflows/publish.yml`, and the `Release` environment.

## Recovery

- If release preparation fails, fix the cause and rerun the preparation workflow. Each run creates a uniquely named branch.
- If publishing fails before npm accepts the package, fix the cause and rerun the failed workflow.
- If npm publishing succeeds but tag or GitHub release creation fails, do not rerun the entire publish job blindly because npm versions are immutable. Confirm the package state first, then manually create and push the `plugin-rsc@<version>` tag at the original release commit and create the GitHub release from the corresponding changelog entry.
- If the release tag already exists, investigate whether the package was previously published before retrying or changing any release state.
