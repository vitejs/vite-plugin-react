import { ClientForm } from './client-form.tsx'

export function Root(props: { url: URL }) {
  return (
    <html lang="en">
      <body>
        <h1>Cross-environment action reachability</h1>
        <ClientForm />
        <p>Request URL: {props.url.href}</p>
      </body>
    </html>
  )
}
