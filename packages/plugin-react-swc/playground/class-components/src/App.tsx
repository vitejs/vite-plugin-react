import { getGetting } from './utils.tsx'
import { Component } from 'react'

export class App extends Component {
  render() {
    return <span>{getGetting()} World</span>
  }
}
