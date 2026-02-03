const EventEmitter = require('node:events')

class CustomEventEmitter extends EventEmitter {
  constructor() {
    super()
    this.testValue = 'ok'
  }
}

module.exports.test = new CustomEventEmitter().testValue || 'ko'
