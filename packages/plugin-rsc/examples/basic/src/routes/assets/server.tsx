// import { TestAssetsClient } from "./client";
import './test-url.css'
import viteLogo from './vite.svg'

export function TestAssetsServer() {
  return (
    <>
      <div>
        <span>test-assets-server</span>
        <img src={viteLogo} data-testid="test-assets-server-js" />
        <span
          className="test-assets-server-css"
          data-testid="test-assets-server-css"
        />
      </div>
      {/* <TestAssetsClient /> */}
    </>
  )
}
