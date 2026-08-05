## Input

```js
'use server'

export function recursive(depth) {
  if (depth > 0) return recursive(depth - 1)
  return recursive.marker
}
```

## wrap-export

**Status:** transformed

**References:** recursive

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjE0ACd1c2Ugc2VydmVyJwoKZnVuY3Rpb24gcmVjdXJzaXZlKGRlcHRoKSB7CiAgaWYgKGRlcHRoID4gMCkgcmV0dXJuIHJlY3Vyc2l2ZShkZXB0aCAtIDEpCiAgcmV0dXJuIHJlY3Vyc2l2ZS5tYXJrZXIKfQpyZWN1cnNpdmUgPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UocmVjdXJzaXZlLCAicmVjdXJzaXZlIik7CmV4cG9ydCB7IHJlY3Vyc2l2ZSB9Owo0MzIAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGZ1bmN0aW9uIHJlY3Vyc2l2ZShkZXB0aCkge1xuICBpZiAoZGVwdGggPiAwKSByZXR1cm4gcmVjdXJzaXZlKGRlcHRoIC0gMSlcbiAgcmV0dXJuIHJlY3Vyc2l2ZS5tYXJrZXJcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVKLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFDbkI7QUFIQTtBQUFBOyJ9)

```js
'use server'

function recursive(depth) {
  if (depth > 0) return recursive(depth - 1)
  return recursive.marker
}
recursive = /* #__PURE__ */ registerServerReference(recursive, "recursive");
export { recursive };
```

## module-export-effect

**Status:** transformed

**References:** recursive

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTg3ACd1c2Ugc2VydmVyJwoKZnVuY3Rpb24gcmVjdXJzaXZlKGRlcHRoKSB7CiAgaWYgKGRlcHRoID4gMCkgcmV0dXJuIHJlY3Vyc2l2ZShkZXB0aCAtIDEpCiAgcmV0dXJuIHJlY3Vyc2l2ZS5tYXJrZXIKfQoKcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UocmVjdXJzaXZlLCAicmVjdXJzaXZlIik7CmV4cG9ydCB7IHJlY3Vyc2l2ZSB9Owo0MzcAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGZ1bmN0aW9uIHJlY3Vyc2l2ZShkZXB0aCkge1xuICBpZiAoZGVwdGggPiAwKSByZXR1cm4gcmVjdXJzaXZlKGRlcHRoIC0gMSlcbiAgcmV0dXJuIHJlY3Vyc2l2ZS5tYXJrZXJcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVKLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFDbkI7QUFIQTtBQUFBO0FBQUE7In0=)

```js
'use server'

function recursive(depth) {
  if (depth > 0) return recursive(depth - 1)
  return recursive.marker
}

registerServerReference(recursive, "recursive");
export { recursive };
```

## proxy-export

**Status:** transformed

**References:** recursive

[Source map visualization](https://evanw.github.io/source-map-visualization/#ODAACgpleHBvcnQgY29uc3QgcmVjdXJzaXZlID0gLyogI19fUFVSRV9fICovIGNyZWF0ZVNlcnZlclJlZmVyZW5jZSgicmVjdXJzaXZlIik7CgoyMTEAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGZ1bmN0aW9uIHJlY3Vyc2l2ZShkZXB0aCkge1xuICBpZiAoZGVwdGggPiAwKSByZXR1cm4gcmVjdXJzaXZlKGRlcHRoIC0gMSlcbiAgcmV0dXJuIHJlY3Vyc2l2ZS5tYXJrZXJcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBOzsifQ==)

```js


export const recursive = /* #__PURE__ */ createServerReference("recursive");

```
