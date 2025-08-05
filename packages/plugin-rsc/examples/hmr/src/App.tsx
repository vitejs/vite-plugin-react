import { key } from './lookup'
import Item from './Item'

const App = async () => {
  return (
    <html>
      <head>
        <title>Hmr</title>
      </head>
      <body>
        <Item k={key} />
      </body>
    </html>
  )
}

export default App
