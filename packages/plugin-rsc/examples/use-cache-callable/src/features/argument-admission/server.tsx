async function fixed(declared = 'default') {
  'use cache'
  return `${declared}:${crypto.randomUUID()}`
}

async function rest(declared: string, ...remaining: string[]) {
  'use cache'
  return `${declared}:${remaining.join(':')}:${crypto.randomUUID()}`
}

function withCapture(captured: string) {
  return async function cached(declared: string) {
    'use cache'
    return `${captured}:${declared}:${crypto.randomUUID()}`
  }
}

export async function ArgumentAdmission() {
  const callFixed = fixed as (...args: string[]) => Promise<string>
  const fixedFirst = await callFixed('same', 'first extra')
  const fixedSecond = await callFixed('same', 'second extra')
  const fixedDifferent = await callFixed('different', 'second extra')

  const restFirst = await rest('same', 'first extra')
  const restSecond = await rest('same', 'second extra')

  const capturedAlpha = withCapture('alpha')
  const capturedBeta = withCapture('beta')
  const captureFirst = await capturedAlpha('same')
  const captureSecond = await capturedAlpha('same')
  const captureDifferent = await capturedBeta('same')

  return (
    <dl>
      <dt>Undeclared fixed-signature extras</dt>
      <dd data-testid="fixed-extra-admission">
        {fixedFirst === fixedSecond ? 'excluded' : 'included'}
      </dd>
      <dt>Declared fixed-signature arguments</dt>
      <dd data-testid="fixed-declared-admission">
        {fixedSecond !== fixedDifferent ? 'included' : 'excluded'}
      </dd>
      <dt>Rest arguments</dt>
      <dd data-testid="rest-admission">
        {restFirst !== restSecond ? 'included' : 'excluded'}
      </dd>
      <dt>Decoded captures</dt>
      <dd data-testid="capture-admission">
        {captureFirst === captureSecond && captureSecond !== captureDifferent
          ? 'included'
          : 'excluded'}
      </dd>
    </dl>
  )
}
