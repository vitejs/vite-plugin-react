'use server'

const source = async () => 'destructured export called'

export const { action } = { action: source }
