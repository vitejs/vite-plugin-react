const EventEmitter = require('events')

class CustomEventEmitter extends EventEmitter {
  constructor() {
    super()
    this.testValue = 'working'
  }

  getTestValue() {
    // console.trace('getTestValue called');
    return this.testValue
  }
}

module.exports = { CustomEventEmitter }
