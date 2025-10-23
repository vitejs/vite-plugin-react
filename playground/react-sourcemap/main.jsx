import App from './App.jsx'
import React from 'react'
import ReactDOM from 'react-dom/client'

ReactDOM.createRoot(document.getElementById('app')).render(
  React.createElement(App),
)

console.log('main.jsx') // for sourcemap
