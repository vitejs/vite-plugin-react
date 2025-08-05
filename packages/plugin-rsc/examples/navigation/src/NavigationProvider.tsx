'use client'
import { useMemo } from 'react'
import { StateNavigator, HTML5HistoryManager } from 'navigation'
import { NavigationHandler } from 'navigation-react'
import stateNavigator from './stateNavigator'

const historyManager = new HTML5HistoryManager()

const NavigationProvider = ({ url, children }: any) => {
  const clientNavigator = useMemo(() => {
    historyManager.stop()
    const clientNavigator = new StateNavigator(stateNavigator, historyManager)
    clientNavigator.navigateLink(url)
    return clientNavigator
  }, [])
  return (
    <NavigationHandler stateNavigator={clientNavigator}>
      {children}
    </NavigationHandler>
  )
}

export default NavigationProvider
