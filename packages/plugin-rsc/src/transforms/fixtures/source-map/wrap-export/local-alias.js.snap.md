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

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTcwACd1c2Ugc2VydmVyJwoKYXN5bmMgZnVuY3Rpb24gbG9jYWxBbGlhcygpIHsKICByZXR1cm4gJ2xvY2FsIGFsaWFzIGNhbGxlZCcKfQoKZXhwb3J0IHsgbG9jYWxBbGlhcyBhcyBhbGlhc2VkQWN0aW9uIH0KCnJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGxvY2FsQWxpYXMsICJhbGlhc2VkQWN0aW9uIik7Mzg4AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmFzeW5jIGZ1bmN0aW9uIGxvY2FsQWxpYXMoKSB7XG4gIHJldHVybiAnbG9jYWwgYWxpYXMgY2FsbGVkJ1xufVxuXG5leHBvcnQgeyBsb2NhbEFsaWFzIGFzIGFsaWFzZWRBY3Rpb24gfVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRVgsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU07QUFDNUI7O0FBRUEsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQzs7In0=)

```js
'use server'

async function localAlias() {
  return 'local alias called'
}

export { localAlias as aliasedAction }

registerServerReference(localAlias, "aliasedAction");
```

## proxy-export

**Status:** transformed

**References:** aliasedAction

[Source map visualization](https://evanw.github.io/source-map-visualization/#OTAACgoKCmV4cG9ydCBjb25zdCBhbGlhc2VkQWN0aW9uID0gLyogI19fUFVSRV9fICovIGNyZWF0ZVNlcnZlclJlZmVyZW5jZSgiYWxpYXNlZEFjdGlvbiIpOwoKMjA4AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmFzeW5jIGZ1bmN0aW9uIGxvY2FsQWxpYXMoKSB7XG4gIHJldHVybiAnbG9jYWwgYWxpYXMgY2FsbGVkJ1xufVxuXG5leHBvcnQgeyBsb2NhbEFsaWFzIGFzIGFsaWFzZWRBY3Rpb24gfVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFNQTs7In0=)

```js




export const aliasedAction = /* #__PURE__ */ createServerReference("aliasedAction");

```
