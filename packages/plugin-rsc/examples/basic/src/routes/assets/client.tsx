'use client'

import './test-url.css'
import viteLogo from './vite.svg'

export function TestAssetsClient() {
  return (
    <div className="flex flex-col p-2 gap-2">
      <h3 className="font-bold">Test Assets</h3>
      <div className="flex items-center gap-2">
        <img src={viteLogo} className="size-10" data-testid="js-import" /> js
        import
      </div>
      <div className="flex items-center gap-2">
        <span className="test-css-url size-10" data-testid="css-url" /> css
        url()
      </div>
    </div>
  )
}
