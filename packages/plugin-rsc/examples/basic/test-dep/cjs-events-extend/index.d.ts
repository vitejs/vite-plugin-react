import { EventEmitter } from 'events'

export class CustomEventEmitter extends EventEmitter {
  constructor()
  testValue: string
  getTestValue(): string
}
