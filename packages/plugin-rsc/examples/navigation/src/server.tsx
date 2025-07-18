import { renderRequest } from '@vitejs/plugin-rsc/extra/rsc'
import { StateNavigator } from 'navigation'
import stateNavigator from './stateNavigator.ts'

export default async function handler(request: Request): Promise<Response> {
  let url: string;
  let view: any;
  const serverNavigator = new StateNavigator(stateNavigator);
  if (request.method === 'GET') {
    let reqUrl = new URL(request.url);
    url = `${reqUrl.pathname}${reqUrl.search}`;
    const App = (await import('./App.tsx')).default;
    view = <App url={url} />;
  } else {    
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
  }
  try {
    serverNavigator.navigateLink(url)
  } catch(e) {
    return new Response('Not Found', { status: 404 });
  }
  const { NavigationHandler } = await import('navigation-react');
  const root = (
    <>
      <NavigationHandler stateNavigator={serverNavigator}>
        {view}
      </NavigationHandler>
    </>
  );
  return renderRequest(request, root);
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
