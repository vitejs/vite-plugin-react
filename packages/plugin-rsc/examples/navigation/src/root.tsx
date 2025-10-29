import './index.css'
import { HomePage } from './routes/home'
import { AboutPage } from './routes/about'
import { SlowPage } from './routes/slow'

export function Root(props: { url: URL }) {
  const pathname = props.url.pathname

  let page: React.ReactNode
  let title = 'Navigation Example'

  if (pathname === '/about') {
    page = <AboutPage />
    title = 'About - Navigation Example'
  } else if (pathname === '/slow') {
    page = <SlowPage url={props.url} />
    title = 'Slow Page - Navigation Example'
  } else {
    page = <HomePage />
    title = 'Home - Navigation Example'
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
      </head>
      <body>
        <div className="app">
          <nav className="nav">
            <h2>RSC Navigation</h2>
            <div className="nav-links">
              <a href="/" className={pathname === '/' ? 'active' : ''}>
                Home
              </a>
              <a
                href="/about"
                className={pathname === '/about' ? 'active' : ''}
              >
                About
              </a>
              <a href="/slow" className={pathname === '/slow' ? 'active' : ''}>
                Slow Page
              </a>
            </div>
          </nav>
          <main className="main">{page}</main>
        </div>
      </body>
    </html>
  )
}
