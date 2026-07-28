import { HomeAction } from './client.tsx'

export function Page() {
  return (
    <main>
      <h1>Home route</h1>
      <HomeAction />
      <a href="/other">Other route</a>
    </main>
  )
}
