export default function App() {
  const rand = Math.random()
  const log = async function (mesg) {
    'use server'
    console.log(mesg, rand)
  }
  return log
}
