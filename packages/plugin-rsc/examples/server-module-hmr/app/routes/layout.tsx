import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { ClientPage } from '../components/client-page'

type WorkflowComponentModule = {
  default: () => ReactNode
}

const workflowModules = import.meta.glob<WorkflowComponentModule>(
  '../workflow-components/*/component.tsx',
)

export function loader() {
  return { ready: true }
}

export async function ServerComponent() {
  const loadWorkflow =
    workflowModules['../workflow-components/demo/component.tsx']!
  const workflowModule = await loadWorkflow()
  const WorkflowComponent = workflowModule.default

  return (
    <ClientPage>
      <WorkflowComponent />
      <Outlet />
    </ClientPage>
  )
}
