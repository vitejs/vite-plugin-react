export function Repro() {
  return (
    <div>
      <form
        action={async () => {
          'use server'
          console.log('repro')
        }}
      >
        <button>repro</button>
      </form>
    </div>
  )
}
