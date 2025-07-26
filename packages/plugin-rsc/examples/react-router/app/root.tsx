import './styles.css'
import { Link, Outlet } from 'react-router'
import { ServerHmr } from '../react-router-vite/server-hmr'
import { TestClientState, TestHydrated } from './routes/client'
import { DumpError, GlobalNavigationLoadingBar } from './routes/root.client'

export function Layout({ children }: { children: React.ReactNode }) {
  console.log('Layout')
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>React Router Vite</title>
      </head>
      <body>
        <header className="container px-8 my-8 mx-auto">
          <nav className="paper paper-border">
            <ul className="flex gap-4 flex-wrap">
              <li className="flex gap-4 not-last:after:block not-last:after:content-['|']">
                <Link to="/">Home</Link>
              </li>
              <li className="flex gap-4 not-last:after:block">
                <Link to="/about">About</Link>
              </li>
              <li className="flex-1"></li>
              <li className="flex items-center gap-2 text-gray-500">
                <TestHydrated />
                <TestClientState />
                <span data-testid="root-style" className="text-[#0000ff]">
                  [style]
                </span>
              </li>
            </ul>
          </nav>
        </header>
        <GlobalNavigationLoadingBar />
        <ServerHmr />
        {children}
      </body>
    </html>
  )
}

export default function Component() {
  console.log('Root')
  return (
    <>
      <Outlet />
    </>
  )
}

export function ErrorBoundary() {
  return <DumpError />
}
