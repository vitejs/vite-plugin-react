export function InlineDirective() {
  const captured = 'captured'

  async function inlineAction() {
    'use server'
    return 'inline directive called'
  }

  const inlineArrow = async (suffix = 'arrow') => {
    'use server'
    return `${captured} ${suffix} called`
  }

  consume(inlineAction, inlineArrow, async function () {
    'use server'
    return 'inline function expression called'
  })
}
