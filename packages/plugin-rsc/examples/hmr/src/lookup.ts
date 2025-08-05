export const key = 'a'

const data = {
  [key]: { hello: 'world ' },
} as Record<string, { hello: string }>

const lookup = (k: string) => {
  return data[k]
}

export default lookup
