## Input

```js
'use server'

export * as namespace from './dep.js'
```

## proxy-export

**Status:** transformed

**References:** namespace

[Source map visualization](https://evanw.github.io/source-map-visualization/#ODAACgpleHBvcnQgY29uc3QgbmFtZXNwYWNlID0gLyogI19fUFVSRV9fICovIGNyZWF0ZVNlcnZlclJlZmVyZW5jZSgibmFtZXNwYWNlIik7CgoxMzgAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0ICogYXMgbmFtZXNwYWNlIGZyb20gJy4vZGVwLmpzJ1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUE7OyJ9)

```js


export const namespace = /* #__PURE__ */ createServerReference("namespace");

```
