import "./App.css";
import { Counter, StyledCode } from "./Button.tsx";

export const App = () => (
  <div>
    <div>
      <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
        <img src="/vite.svg" className="logo" alt="Vite logo" />
      </a>
      <a href="https://styled-components.com" target="_blank" rel="noreferrer">
        <img
          src="https://styled-components.com/logo.png"
          className="logo styled-components"
          alt="styled components logo"
        />
      </a>
    </div>
    <div className="card">
      <Counter />
      <p>
        Edit <StyledCode>src/Button.tsx</StyledCode> and save to test HMR
      </p>
    </div>
    <p className="read-the-docs">
      Click on the Vite and Styled Components logos to learn more
    </p>
  </div>
);
