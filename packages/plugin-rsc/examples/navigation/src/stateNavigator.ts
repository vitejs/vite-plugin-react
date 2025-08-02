import { StateNavigator } from 'navigation'

const stateNavigator = new StateNavigator([
  {
    key: 'people',
    route: '{page?}',
    defaults: { page: 1, sort: 'asc', size: 10 },
  },
  {
    key: 'person',
    route: 'person/{id}+/{show}',
    defaults: { id: 0, show: false },
    trackCrumbTrail: true,
  },
])
stateNavigator.historyManager.stop()

export default stateNavigator
