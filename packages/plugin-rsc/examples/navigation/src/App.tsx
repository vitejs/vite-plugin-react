import { SceneView } from 'navigation-react'
import NavigationProvider from './NavigationProvider'
import HmrProvider from './HmrProvider'
import People from './People'
import Person from './Person'

const App = async ({ url }: any) => {
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

export default App;
