export default function App() {
  const a = 'test'
  async function log(mesg) {
    'use server'
    console.log(mesg, a)
  }
  return log
}
