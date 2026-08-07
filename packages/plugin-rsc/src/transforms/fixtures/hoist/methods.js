const key = 'computed'
const __proto__ = 'computed-proto'

export function createObject(value) {
  return {
    async action(arg) {
      'use server'
      return value + arg
    },
    async [key]() {
      'use server'
      return value + 1
    },
    async __proto__() {
      'use server'
      return value + 2
    },
    async [__proto__]() {
      'use server'
      return value + 3
    },
    async 'foo-bar'() {
      'use server'
      return value + 4
    },
    async 1.5() {
      'use server'
      return value + 5
    },
  }
}

export class Actions {
  static async action() {
    'use server'
    return 1
  }

  static async ['computed']() {
    'use server'
    return 2
  }

  static async [key]() {
    'use server'
    return 3
  }

  static async constructor() {
    'use server'
    return 4
  }
}

export function createActions(value) {
  return class Actions {
    static async action() {
      'use server'
      return value
    }
  }
}
