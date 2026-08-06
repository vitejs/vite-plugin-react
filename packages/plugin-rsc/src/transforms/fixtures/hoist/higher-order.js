// Adapted from React's Next.js server action examples.
export default function Page() {
  const x = 0
  const action = validator(async (y) => {
    'use server'
    return x + y
  })
}

function validator(action) {
  return async function (arg) {
    'use server'
    return action(arg)
  }
}
