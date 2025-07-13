import { SceneView } from 'navigation-react'
import NavigationProvider from './NavigationProvider'
import HmrProvider from './HmrProvider'
import People from './People'
import Person from './Person'

export function App({ url }: any) {
  return (
    <html>
      <head>
        <title>Navigation React</title>
      </head>
      <body>
        <NavigationProvider url={url}>
          <HmrProvider>
            <SceneView active="people">
              <People />
            </SceneView>
            <SceneView active="person" refetch={['id']}>
              <Person />
            </SceneView>
          </HmrProvider>
        </NavigationProvider>
      </body>
    </html>
  )
}
