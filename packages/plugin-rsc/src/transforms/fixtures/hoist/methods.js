const key = 'computed'

export function createObject(value) {
  return {
    async action() {
      'use server'
      return value
    },
    async [key]() {
      'use server'
      return value + 1
    },
    async __proto__() {
      'use server'
      return value + 2
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
}
