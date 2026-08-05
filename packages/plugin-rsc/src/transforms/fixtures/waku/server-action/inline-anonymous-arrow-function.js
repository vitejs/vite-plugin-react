const now = Date.now()
export default function App() {
  return (mesg) => {
    'use server'
    console.log('%s', mesg, now)
  }
}
