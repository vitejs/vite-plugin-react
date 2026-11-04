export function AboutPage() {
  return (
    <div className="page">
      <h1>About</h1>
      <p>
        This is a React Server Component rendered on the server and streamed to
        the client.
      </p>
      <div className="card">
        <h2>Navigation Coordination</h2>
        <p>
          When you navigate between pages, the navigation is coordinated with
          React transitions to ensure:
        </p>
        <ol>
          <li>The URL updates at the right time</li>
          <li>Loading states are properly displayed</li>
          <li>Race conditions are prevented</li>
          <li>Back/forward navigation works correctly</li>
        </ol>
      </div>
      <div className="card">
        <h2>Current Time</h2>
        <p>
          This page was rendered on the server at:{' '}
          <strong>{new Date().toLocaleTimeString()}</strong>
        </p>
        <p>
          Navigate away and back to see the time update, demonstrating that the
          page is re-rendered on the server each time.
        </p>
      </div>
      <div className="card">
        <h2>Section 1: What are RSCs?</h2>
        <p>
          React Server Components are a new type of component that runs only on
          the server. They can directly access server-side resources like
          databases, file systems, or APIs without needing to create separate
          API endpoints.
        </p>
        <p>
          This architectural pattern reduces the amount of JavaScript shipped to
          the client and enables better performance for data-heavy applications.
        </p>
      </div>
      <div className="card">
        <h2>Section 2: Key Differences</h2>
        <p>Unlike client components, server components:</p>
        <ul>
          <li>Cannot use React hooks like useState or useEffect</li>
          <li>Cannot handle browser events directly</li>
          <li>Can be async functions that await data</li>
          <li>Don't add to the client JavaScript bundle</li>
          <li>Can import and use server-only packages safely</li>
        </ul>
      </div>
      <div className="card">
        <h2>Section 3: Composition Patterns</h2>
        <p>
          Server and client components can be composed together seamlessly. A
          common pattern is to have server components fetch data and pass it as
          props to client components that handle interactivity.
        </p>
        <p>
          This separation of concerns creates a clean architecture where data
          fetching and rendering logic stay on the server, while interactive
          features run on the client.
        </p>
      </div>
      <div className="card">
        <h2>Section 4: Streaming Benefits</h2>
        <p>
          RSCs support streaming, meaning the server can start sending UI to the
          client before all data is ready. This creates a progressive loading
          experience where users see content incrementally rather than waiting
          for everything to load.
        </p>
        <p>
          Suspense boundaries can be used to define loading states for different
          parts of the page, enabling fine-grained control over the streaming
          behavior.
        </p>
      </div>
      <div className="card">
        <h2>Section 5: Caching Strategies</h2>
        <p>
          In this navigation example, we implement a simple but effective
          caching strategy. Each time you visit a page, the RSC payload is
          cached and associated with the browser history entry.
        </p>
        <p>
          This means when you use back/forward navigation, the page loads
          instantly from cache. The cache persists for the session, providing a
          smooth browsing experience.
        </p>
      </div>
      <div className="card">
        <h2>Section 6: Performance Metrics</h2>
        <p>
          By keeping heavy rendering logic on the server, RSCs can significantly
          improve metrics like Time to Interactive (TTI) and First Input Delay
          (FID). The reduced JavaScript bundle means faster parsing and
          execution.
        </p>
        <p>
          Additionally, server-side rendering enables better SEO and faster
          First Contentful Paint (FCP) for initial page loads.
        </p>
      </div>
      <div className="card">
        <h2>Section 7: Scroll Testing Area</h2>
        <p>
          Scroll to this section and remember its position. Then navigate to
          another page and come back using the browser back button.
        </p>
        <p>
          The browser will automatically restore your scroll position to this
          exact location, demonstrating native scroll restoration working with
          our coordinated navigation.
        </p>
      </div>
      <div className="card">
        <h2>Section 8: End of About Page</h2>
        <p>
          This is the end of the About page. Notice the timestamp at the top -
          it updates each time you navigate to this page (not from cache),
          showing that the server re-renders the component.
        </p>
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.7 }}>
          📍 Bottom marker - Use this to test scroll restoration!
        </p>
      </div>
    </div>
  )
}
