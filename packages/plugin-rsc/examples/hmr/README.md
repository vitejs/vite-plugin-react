The `App` just renders a client `Item` component passing in a key which It gets from 'lookup.ts'. The `Item` passes this key into 'lookup.ts' to get the value which it then displays. If you edit the key in 'lookup.ts' from 'a' to 'b', for example, then the hmr update throws.

```ts
export const key = 'b'
```

The reason for the error is that the server response uses the latest 'lookup.ts' but the client uses the old 'lookup.ts'. So the rsc response has the key 'b' but the client still has the key 'a'.
