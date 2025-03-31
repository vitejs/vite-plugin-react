import "./App.css";
import { Button, StyledCode } from "./Button.tsx";

export const App = () => (
  <div>
    <div>
      <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
        <img src="/vite.svg" className="logo" alt="Vite logo" />
      </a>
      <a href="https://emotion.sh/" target="_blank" rel="noreferrer">
        <img
          src="https://emotion.sh/logo-96x96.png"
          className="logo emotion"
          alt="Emotion logo"
        />
      </a>
    </div>
    <div className="card">
      <Button color="#646cff" />
      <p>
        Edit <StyledCode>src/Button.tsx</StyledCode> and save to test HMR
      </p>
    </div>
    <p className="read-the-docs">
      Click on the Vite and Emotion logos to learn more
    </p>
  </div>
);
