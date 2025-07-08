import TestNonJs from '@vitejs/test-dep-non-js'

export default function App() {
  return (
    <section style={{ margin: 24 }}>
      <header style={{ display: 'flex', gap: 24 }}>
        {/* <Link to="/">Home</Link>
        <Link to="/about">About</Link> */}
      </header>

      <main>
        <TestNonJs />
      </main>
    </section>
  )
}
