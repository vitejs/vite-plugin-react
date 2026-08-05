## Input

```js
{
  const require = () => {};
  require("test");
}
```

## cjs-to-esm

**Status:** transformed

**References:** (none)

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjcxAGxldCBfX2ZpbGVuYW1lID0gIi90ZXN0LmpzIjsgbGV0IF9fZGlybmFtZSA9ICIvIjsKbGV0IGV4cG9ydHMgPSB7fTsgY29uc3QgbW9kdWxlID0geyBleHBvcnRzIH07CnsKICBjb25zdCByZXF1aXJlID0gKCkgPT4ge307CiAgcmVxdWlyZSgidGVzdCIpOwp9Cgo7X192aXRlX3Nzcl9leHBvcnRBbGxfXyhtb2R1bGUuZXhwb3J0cyk7CmV4cG9ydCBkZWZhdWx0IG1vZHVsZS5leHBvcnRzOwpleHBvcnQgY29uc3QgX19janNfbW9kdWxlX3J1bm5lcl90cmFuc2Zvcm0gPSB0cnVlOwoyODAAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJ7XG4gIGNvbnN0IHJlcXVpcmUgPSAoKSA9PiB7fTtcbiAgcmVxdWlyZShcInRlc3RcIik7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pCOzs7OzsifQ==)

```js
let __filename = "/test.js"; let __dirname = "/";
let exports = {}; const module = { exports };
{
  const require = () => {};
  require("test");
}

;__vite_ssr_exportAll__(module.exports);
export default module.exports;
export const __cjs_module_runner_transform = true;
```
