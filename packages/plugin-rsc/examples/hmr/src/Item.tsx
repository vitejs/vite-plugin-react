'use client'
import lookup from './lookup'

const Item = ({ k }: { k: string }) => {
  return lookup(k).hello
}

export default Item
