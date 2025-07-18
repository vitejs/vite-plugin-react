'use client'
import { useContext, useEffect } from 'react'
import { BundlerContext, useNavigationEvent } from 'navigation-react'

const HmrProvider = ({ children }: any) => {
  const { setRoot, deserialize } = useContext(BundlerContext)
  const { stateNavigator } = useNavigationEvent()
  useEffect(() => {
    const onHmrReload = () => {
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
    import.meta.hot?.on("rsc:update", onHmrReload);
    return () => import.meta.hot?.off("rsc:update", onHmrReload);
  })
  return children
}

export default HmrProvider
