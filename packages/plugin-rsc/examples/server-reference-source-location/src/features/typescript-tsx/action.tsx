'use server'

export async function typescriptTsx(value: string = 'tsx'): Promise<string> {
  const element = <span>{value}</span>
  return `${element.type}:${element.props.children}`
}
