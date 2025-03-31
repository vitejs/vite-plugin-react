import { memo } from "react";

function App() {
  return <div>Shadow export</div>;
}

// For anyone reading this, don't do that
// Use PascalCase for all components and export them directly without rename,
// you're just making grep more complex.
const withMemo = memo(App);
export { withMemo as App };
