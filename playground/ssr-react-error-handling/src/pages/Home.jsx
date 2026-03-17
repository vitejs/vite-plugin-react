export default function Home() {
  return (
    <>
      <h1>Home</h1>
      <p>
        This example demonstrates SSR error handling patterns with React 19 and
        Vite.
      </p>
      <ul>
        <li>
          <a href="/throws-render">Throws during render</a> - triggers onError
          callback + ErrorBoundary
        </li>
        <li>
          <a href="/throws-effect">Throws in effect</a> - client-only error
          caught by ErrorBoundary
        </li>
      </ul>
    </>
  )
}
