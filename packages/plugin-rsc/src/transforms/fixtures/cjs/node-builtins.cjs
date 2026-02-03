const EventEmitter = require('node:events')

class CustomEmitter extends EventEmitter {
  constructor() {
    super()
    this.custom = true
  }
}

exports.nodeEventsOk = new CustomEmitter().custom
