## Input

```js
'use server'

export default class {}
```

## wrap-export

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTcxACd1c2Ugc2VydmVyJwoKY29uc3QgJCRkZWZhdWx0ID0gY2xhc3Mge30KOwpjb25zdCAkJHdyYXBfJCRkZWZhdWx0ID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKCQkZGVmYXVsdCwgImRlZmF1bHQiKTsKZXhwb3J0IHsgJCR3cmFwXyQkZGVmYXVsdCBhcyBkZWZhdWx0IH07CjE3MQB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7fVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRVgsa0JBQWUsS0FBSyxDQUFDLENBQUM7Ozs7In0=)

```js
'use server'

const $$default = class {}
;
const $$wrap_$$default = /* #__PURE__ */ registerServerReference($$default, "default");
export { $$wrap_$$default as default };
```

## module-export-effect

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTM2ACd1c2Ugc2VydmVyJwoKY29uc3QgJCRlZmZlY3RfZGVmYXVsdCA9IGNsYXNzIHt9CgpyZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGVmZmVjdF9kZWZhdWx0LCAiZGVmYXVsdCIpOwpleHBvcnQgZGVmYXVsdCAkJGVmZmVjdF9kZWZhdWx0OwoxODQAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge31cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVMLHlCQUFTLEtBQUssQ0FBQyxDQUFDO0FBQXRCO0FBQUE7QUFBQTsifQ==)

```js
'use server'

const $$effect_default = class {}

registerServerReference($$effect_default, "default");
export default $$effect_default;
```

## proxy-export

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#NjgACgpleHBvcnQgZGVmYXVsdCAvKiAjX19QVVJFX18gKi8gY3JlYXRlU2VydmVyUmVmZXJlbmNlKCJkZWZhdWx0Iik7CgoxMjQAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge31cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBOzsifQ==)

```js


export default /* #__PURE__ */ createServerReference("default");

```
