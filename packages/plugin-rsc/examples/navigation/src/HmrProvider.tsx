'use client'
import { useContext, useEffect } from 'react'
import { BundlerContext, useNavigationEvent } from 'navigation-react'

const HmrProvider = ({ children }: any) => {
  const { setRoot, deserialize } = useContext(BundlerContext)
  const { stateNavigator } = useNavigationEvent()
  useEffect(() => {
    const onHmrReload = (e: any) => {
      e.preventDefault()
      const {
        stateContext: {
          state,
          data,
          crumbs,
          nextCrumb: { crumblessUrl },
        },
      } = stateNavigator
      const root = deserialize(
        stateNavigator.historyManager.getHref(crumblessUrl),
        {
          method: 'put',
          headers: { 'Content-Type': 'application/json' },
          body: {
            crumbs: crumbs.map(({ state, data }) => ({
              state: state.key,
              data,
            })),
            state: state.key,
            data,
          },
        },
      )
      stateNavigator.historyManager.stop()
      setRoot(root)
    }
    window.addEventListener('parcelhmrreload', onHmrReload)
    return () => window.removeEventListener('parcelhmrreload', onHmrReload)
  })
  return children
}

export default HmrProvider
