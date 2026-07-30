export function validatePublishVersion(version: string): void {
  const prerelease = version.match(/^\d+\.\d+\.\d+-([^+]+)/)?.[1]
  // only allow alpha and beta prereleases
  // as @vitejs/release-scripts only supports these two types
  if (
    prerelease &&
    !prerelease.includes('alpha') &&
    !prerelease.includes('beta')
  ) {
    throw new Error(
      `Only alpha and beta prereleases are supported, received ${version}`,
    )
  }
}
