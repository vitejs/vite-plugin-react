import viteLogo from '/vite.svg'

export function StaticHeader() {
  return (
    <header className="header">
      <div className="logo-container">
        <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
      </div>
      <h1>Partial Prerendering (PPR) Demo</h1>
      <p className="subtitle">
        Combining static generation with dynamic streaming
      </p>
    </header>
  )
}
