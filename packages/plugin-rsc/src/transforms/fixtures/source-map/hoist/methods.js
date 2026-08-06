const key = 'computed'

export function createObject(value) {
  return {
    async [getKey(key, value)]() {
      'use server'
      return value
    },
  }
}

export class Actions {
  static async action() {
    'use server'
    return 1
  }
}
