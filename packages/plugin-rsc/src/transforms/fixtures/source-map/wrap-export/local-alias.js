'use server'

async function localAlias() {
  return 'local alias called'
}

export { localAlias as aliasedAction }
