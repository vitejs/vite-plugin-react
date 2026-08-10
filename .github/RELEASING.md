# Releasing Packages

All publishable packages in this repository use a pull-request-driven release flow. GitHub Actions prepares a release PR containing the version bump and changelog, and merging that PR triggers publishing.

## Prepare a Release

1. Run the [Prepare Release](workflows/prepare-release.yml) workflow from the `main` branch.
2. Select the package to release.
3. Select a `release` type. The default `next` creates the next patch for a stable version or advances an existing prerelease. Alternatively, select another supported release type or enter an exact `version`, which takes precedence over `release`. Prereleases must use an `alpha` or `beta` identifier so npm assigns the correct distribution tag.
4. Wait for `vite-release-bot` to open the release PR. The PR contains the selected package's version bump and changelog entry.

The `plugin-react` and `plugin-react-swc` releases move their manually maintained `Unreleased` notes under the new version. The `plugin-rsc` release generates its changelog from conventional commits.

## Review and Publish

1. Review the generated version and changelog, and wait for the release PR checks to pass.
2. Merge the PR while retaining the `release: <package>@<version>` commit subject. A matching commit at the tip of `main` triggers the publish job.
3. Open the [Publish Package](workflows/publish.yml) run and approve its `Release` environment deployment.
4. Wait for the workflow to publish the package, create the `<package>@<version>` tag, and create the corresponding GitHub release.
5. Verify the new version on npm and check that the tag and GitHub release point to the merged release commit.

## Repository Configuration

The release flow depends on configuration outside this repository:

- The `vite-release-bot` GitHub App must be installed only on `vitejs/vite-plugin-react` with Contents and Pull requests read/write permissions. Webhooks must be disabled.
- `RELEASE_GITHUB_APP_CLIENT_ID` must be a repository variable containing the app client ID.
- `RELEASE_GITHUB_APP_PRIVATE_KEY` must be a repository secret containing the app private key.
- The `Release` environment must require maintainer approval before publishing.
- The npm trusted publishers for `@vitejs/plugin-react`, `@vitejs/plugin-react-swc`, and `@vitejs/plugin-rsc` must be restricted to `vitejs/vite-plugin-react`, `.github/workflows/publish.yml`, and the `Release` environment.

## Recovery

- If release preparation fails, fix the cause and rerun the preparation workflow. Each run creates a uniquely named branch.
- If publishing fails before npm accepts the package, fix the cause and rerun the failed workflow.
- If npm publishing succeeds but tag or GitHub release creation fails, do not rerun the entire publish job blindly because npm versions are immutable. Confirm the package state first, then manually create and push the `<package>@<version>` tag at the original release commit and create the GitHub release from the corresponding changelog entry.
- If the release tag already exists, investigate whether the package was previously published before retrying or changing any release state.
