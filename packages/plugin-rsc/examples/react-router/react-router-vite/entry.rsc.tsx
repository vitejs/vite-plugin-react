import {
  createTemporaryReferenceSet,
  decodeAction,
  decodeFormState,
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import { unstable_matchRSCServerRequest as matchRSCServerRequest } from 'react-router'
import { routes } from '../app/routes'

export default async function handler(request: Request) {
  // Import the generateHTML function from the client environment
  const ssr = await import.meta.viteRsc.loadModule<
    typeof import('./entry.ssr')
  >('ssr', 'index')
  const rscResponse = await fetchServer(request)
  const ssrResponse = await ssr.generateHTML(
    request.url,
    request.headers,
    rscResponse,
  )
  return ssrResponse
}

function fetchServer(request: Request) {
  return matchRSCServerRequest({
    // Provide the React Server touchpoints.
    createTemporaryReferenceSet,
    decodeAction,
    decodeFormState,
    decodeReply,
    loadServerAction,
    // The incoming request.
    request,
    // The app routes.
    routes,
    // Encode the match with the React Server implementation.
    generateResponse(match, options) {
      return new Response(renderToReadableStream(match.payload, options), {
        status: match.statusCode,
        headers: match.headers,
      })
    },
  })
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
