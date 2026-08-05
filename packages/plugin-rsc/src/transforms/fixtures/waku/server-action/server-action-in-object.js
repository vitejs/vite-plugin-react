const AI = {
  actions: {
    foo: async () => {
      'use server'
      return 0
    },
  },
}

export function ServerProvider() {
  return AI
}
