// import { TestAssetsClient } from "./client";
import './test-url.css'
import viteLogo from './vite.svg'

export function TestAssetsServer() {
  return (
    <>
      <div>
        <span>test-assets-server</span>
        <img src={viteLogo} className="size-10" data-testid="js-import" />
        <span className="test-css-url size-10" data-testid="css-url" />
      </div>
      {/* <TestAssetsClient /> */}
    </>
  )
}
