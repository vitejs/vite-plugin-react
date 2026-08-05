export default function App() {
  const rand = Math.random()
  const log = async function (mesg) {
    'use server'
    console.log('%s', mesg, rand)
  }
  return log
}
