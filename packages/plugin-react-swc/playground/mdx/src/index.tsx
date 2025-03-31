import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Hello from "./hello.mdx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Hello />
  </StrictMode>,
);
