import * as ReactServer from '@vitejs/plugin-rsc/rsc';
import { StateNavigator } from 'navigation';
import stateNavigator from './stateNavigator.ts';

export default async function handler(request: Request): Promise<Response> {
  let url: string = '';
  let view: any;
  const serverNavigator = new StateNavigator(stateNavigator);
  if (request.method === 'GET') {
    let reqUrl = new URL(request.url);
    url = `${reqUrl.pathname}${reqUrl.search}`;
    const App = (await import('./App.tsx')).default;
    view = <App url={url} />;
  }
  if (request.method === 'POST') {
    const sceneViews: any = {
      people: await import('./People.tsx'),
      person: await import('./Person.tsx'),
      friends: await import('./Friends.tsx')
    };
    const {url: reqUrl, sceneViewKey} = await request.json();
    url = reqUrl;
    const SceneView = sceneViews[sceneViewKey].default;
    view = <SceneView />;
  }
  if (request.method === 'PUT') {
    const {state, data, crumbs} = await request.json();
    let fluentNavigator = serverNavigator.fluent();
    for (let i = 0; i < crumbs.length; i++) {
      fluentNavigator = fluentNavigator.navigate(crumbs[i].state, crumbs[i].data);
    }
    fluentNavigator = fluentNavigator.navigate(state, data);
    url = fluentNavigator.url;
    const App = (await import('./App.tsx')).default;
    view = <App url={url} />;
  }
  try {
    serverNavigator.navigateLink(url);
  } catch(e) {
    return new Response('Not Found', { status: 404 });
  }
  const {NavigationHandler} = await import('navigation-react');
  const root = (
    <>
      <NavigationHandler stateNavigator={serverNavigator}>
        {view}
      </NavigationHandler>
    </>
  );
  const rscStream = ReactServer.renderToReadableStream({root});
  if (request.method !== 'GET') {
    return new Response(rscStream, {headers: {'Content-type': 'text/x-component'}});
  }
  const ssrEntryModule = await import.meta.viteRsc.loadModule<typeof import('./server.ssr.tsx')>('ssr', 'index');
  const htmlStream = await ssrEntryModule.renderHTML(rscStream);
  return new Response(htmlStream, {headers: {'Content-type': 'text/html'}});
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
