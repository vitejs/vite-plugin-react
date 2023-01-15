import colors from 'picocolors'
import type { Options as ExecaOptions, ExecaReturnValue } from 'execa'
import { execa } from 'execa'

export async function run(
  bin: string,
  args: string[],
  opts: ExecaOptions<string> = {},
): Promise<ExecaReturnValue<string>> {
  return execa(bin, args, { stdio: 'inherit', ...opts })
}

export async function getLatestTag(pkgName: string): Promise<string> {
  return (await run('git', ['tag'], { stdio: 'pipe' })).stdout
    .split(/\n/)
    .filter((tag) => tag && tag.startsWith(`${pkgName}@`))
    .sort()
    .reverse()[0]
}

export async function logRecentCommits(pkgName: string): Promise<void> {
  const tag = await getLatestTag(pkgName)
  if (!tag) return
  const sha = await run('git', ['rev-list', '-n', '1', tag], {
    stdio: 'pipe',
  }).then((res) => res.stdout.trim())
  console.log(
    colors.bold(
      `\n${colors.blue(`i`)} Commits of ${colors.green(
        pkgName,
      )} since ${colors.green(tag)} ${colors.gray(`(${sha.slice(0, 5)})`)}`,
    ),
  )
  await run(
    'git',
    [
      '--no-pager',
      'log',
      `${sha}..HEAD`,
      '--oneline',
      '--',
      `packages/${pkgName}`,
    ],
    { stdio: 'inherit' },
  )
  console.log()
}
