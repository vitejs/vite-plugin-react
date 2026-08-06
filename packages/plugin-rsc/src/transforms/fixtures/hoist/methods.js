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
