import { Component } from 'react'
import { getGetting } from './utils'

export class App extends Component {
  render() {
    return <span>{getGetting()} World</span>
  }
}
