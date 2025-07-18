import { renderRequest } from '@vitejs/plugin-rsc/extra/rsc'
import { StateNavigator } from 'navigation'
import stateNavigator from './stateNavigator.ts'

export default async function handler(request: Request): Promise<Response> {
  let url: string;
  let view: any;
  const { NavigationHandler } = await import('navigation-react');
  const serverNavigator = new StateNavigator(stateNavigator);
  if (request.method === 'PUT') {
    const sceneViews: any = {
      people: await import('./People.tsx'),
      person: await import('./Person.tsx'),
      friends: await import('./Friends.tsx')
    };
    const {url: reqUrl, sceneViewKey, state, data, crumbs} = await request.json();
    if (reqUrl) {
      url = reqUrl;
      const SceneView = sceneViews[sceneViewKey].default;
      view = <SceneView />;
    } else {
      let fluentNavigator = serverNavigator.fluent();
      for (let i = 0; i < crumbs.length; i++) {
        fluentNavigator = fluentNavigator.navigate(crumbs[i].state, crumbs[i].data);
      }
      fluentNavigator = fluentNavigator.navigate(state, data);
      url = fluentNavigator.url;
      const App = (await import('./App.tsx')).default;
      view = <App url={url} />;
    }
  } else {    
    let reqUrl = new URL(request.url);
    url = `${reqUrl.pathname}${reqUrl.search}`;
    const App = (await import('./App.tsx')).default;
    view = <App url={url} />;
  }
  serverNavigator.navigateLink(url)
  const root = (
    <>
      <NavigationHandler stateNavigator={serverNavigator}>
        {view}
      </NavigationHandler>
    </>
  );
  // @ts-ignore
  const nonce = !process.env.NO_CSP ? crypto.randomUUID() : undefined;
  const response = await renderRequest(request, root, { nonce });
  if (nonce) {
    response.headers.set(
      'content-security-policy',
      `default-src 'self'; ` +
        // `unsafe-eval` is required during dev since React uses eval for findSourceMapURL feature
        `script-src 'self' 'nonce-${nonce}' ${
          import.meta.env.DEV ? `'unsafe-eval'` : ``
        } ; ` +
        `style-src 'self' 'nonce-${nonce}'; `,
    );
  }
  return response;
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
