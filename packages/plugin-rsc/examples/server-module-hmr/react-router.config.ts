export default {
  appDirectory: 'app',
  buildDirectory: 'build',
  ssr: true,
  routeDiscovery: {
    mode: 'lazy',
  },
  future: {
    unstable_enableNodeReadableStream: true,
    unstable_optimizeDeps: true,
  },
}
