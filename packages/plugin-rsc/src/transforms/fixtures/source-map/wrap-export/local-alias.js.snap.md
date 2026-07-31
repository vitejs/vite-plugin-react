## Input

```js
'use server'

async function localAlias() {
  return 'local alias called'
}

export { localAlias as aliasedAction }
```

## wrap-export

**Status:** transformed

**References:** aliasedAction

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjIzACd1c2Ugc2VydmVyJwoKYXN5bmMgZnVuY3Rpb24gbG9jYWxBbGlhcygpIHsKICByZXR1cm4gJ2xvY2FsIGFsaWFzIGNhbGxlZCcKfQoKCjsKY29uc3QgJCR3cmFwX2xvY2FsQWxpYXMgPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UobG9jYWxBbGlhcywgImFsaWFzZWRBY3Rpb24iKTsKZXhwb3J0IHsgJCR3cmFwX2xvY2FsQWxpYXMgYXMgYWxpYXNlZEFjdGlvbiB9OwozMzYAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuYXN5bmMgZnVuY3Rpb24gbG9jYWxBbGlhcygpIHtcbiAgcmV0dXJuICdsb2NhbCBhbGlhcyBjYWxsZWQnXG59XG5cbmV4cG9ydCB7IGxvY2FsQWxpYXMgYXMgYWxpYXNlZEFjdGlvbiB9XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxHQUFHLENBQUMsTUFBTTs7QUFFWCxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTTtBQUM1Qjs7Ozs7OyJ9)

```js
'use server'

async function localAlias() {
  return 'local alias called'
}


;
const $$wrap_localAlias = /* #__PURE__ */ registerServerReference(localAlias, "aliasedAction");
export { $$wrap_localAlias as aliasedAction };
```

## module-export-effect

**Status:** transformed

**References:** aliasedAction

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTcyACd1c2Ugc2VydmVyJwoKYXN5bmMgZnVuY3Rpb24gbG9jYWxBbGlhcygpIHsKICByZXR1cm4gJ2xvY2FsIGFsaWFzIGNhbGxlZCcKfQoKCgpyZWdpc3RlclNlcnZlclJlZmVyZW5jZShsb2NhbEFsaWFzLCAiYWxpYXNlZEFjdGlvbiIpOwpleHBvcnQgeyBsb2NhbEFsaWFzIGFzIGFsaWFzZWRBY3Rpb24gfQozNDgAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuYXN5bmMgZnVuY3Rpb24gbG9jYWxBbGlhcygpIHtcbiAgcmV0dXJuICdsb2NhbCBhbGlhcyBjYWxsZWQnXG59XG5cbmV4cG9ydCB7IGxvY2FsQWxpYXMgYXMgYWxpYXNlZEFjdGlvbiB9XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxHQUFHLENBQUMsTUFBTTs7QUFFWCxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTTtBQUM1Qjs7O0FBRUE7QUFBQTtBQUFBOyJ9)

```js
'use server'

async function localAlias() {
  return 'local alias called'
}



registerServerReference(localAlias, "aliasedAction");
export { localAlias as aliasedAction }
```
