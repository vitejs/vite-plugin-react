'use server'

let action = async () => 'first'
export { action as renamed }
action = async () => 'second'
