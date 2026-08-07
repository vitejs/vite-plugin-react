import { detectReleaseCommit } from '@vitejs/release-scripts'

const subject = process.argv[2]
if (!subject) throw new Error('Release commit subject is required')

const release = detectReleaseCommit({
  subject,
  packages: ['plugin-react', 'plugin-react-swc', 'plugin-rsc'],
})

if (release) {
  console.log(
    `package=${release.pkg}\nrelease=true\ntag=${release.tag}\nversion=${release.version}`,
  )
} else {
  console.log('release=false')
}
