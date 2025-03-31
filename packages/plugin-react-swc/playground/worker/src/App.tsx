import { useState } from "react";
import MyWorker from "./worker-via-import.ts?worker&inline";

new MyWorker();

export const App = () => {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>count is {count}</button>;
};
