const now = Date.now()
export default function App() {
  const log = async (mesg) => {
    'use server'
    console.log('%s', mesg, now)
  }
  return log
}
