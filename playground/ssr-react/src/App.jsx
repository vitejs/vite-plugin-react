import React from 'react'

// Auto generates routes from files under ./pages
// https://vitejs.dev/guide/features.html#glob-import
const pages = import.meta.glob('./pages/*.jsx', { eager: true })

const routes = Object.keys(pages).map((path) => {
  const name = path.match(/\.\/pages\/(.*)\.jsx$/)[1]
  return {
    name,
    path: name === 'Home' ? '/' : `/${name.toLowerCase()}`,
    component: pages[path].default,
  }
})

function NotFound() {
  return <h1>Not found</h1>
}

/**
 * @param {{ url: URL }} props
 */
export function App(props) {
  const [url, setUrl] = React.useState(props.url)

  React.useEffect(() => {
    return listenNavigation(() => {
      setUrl(new URL(window.location.href))
    })
  }, [setUrl])

  const route = routes.find((route) => route.path === url.pathname)
  const Component = route?.component ?? NotFound
  return (
    <>
      <nav>
        <ul>
          {routes.map(({ name, path }) => {
            return (
              <li key={path}>
                <a href={path}>{name}</a>
              </li>
            )
          })}
        </ul>
      </nav>
      <Component />
    </>
  )
}

/**
 * @param {() => void} onNavigation
 */
function listenNavigation(onNavigation) {
  /**
   * @param {MouseEvent} e
   */
  function onClick(e) {
    let link = e.target.closest('a')
    if (
      link &&
      link instanceof HTMLAnchorElement &&
      link.href &&
      (!link.target || link.target === '_self') &&
      link.origin === location.origin &&
      !link.hasAttribute('download') &&
      e.button === 0 &&
      !(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey)
    ) {
      e.preventDefault()
      history.pushState(null, '', link.href)
      onNavigation()
    }
  }
  document.addEventListener('click', onClick)
  return () => {
    document.removeEventListener('click', onClick)
  }
}
