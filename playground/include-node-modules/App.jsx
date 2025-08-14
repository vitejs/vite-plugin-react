import test from '@vitejs/test-package'

function App() {
  return (
    <div>
      <h1>Node Modules Include Test</h1>
      <p>
        This playground tests that files in node_modules are processed
        correctly.
      </p>

      <p className="result">Result: {'' + test}</p>
    </div>
  )
}

export default App
