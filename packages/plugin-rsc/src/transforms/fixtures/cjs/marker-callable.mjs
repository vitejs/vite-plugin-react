const value = () => 'ok'

// Node uses this named export to return the value directly from require(esm).
// https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require
export { value as default, value as 'module.exports' }
