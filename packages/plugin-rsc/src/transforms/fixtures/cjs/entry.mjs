import depDefault from './dep1.cjs'
import * as depNamespace from './dep2.cjs'
import dualLib from './dual-lib.cjs'
import depExports from './exports.cjs'
import testExternalFalsyPrimitive from './external-falsy-primitive.cjs'
import depFnRequire from './function-require.cjs'
import depFn from './function.cjs'
import cjsGlobals from './globals.cjs'
import testNodeBuiltins from './node-builtins.cjs'
import depPrimitive from './primitive.cjs'

export {
  depDefault,
  depNamespace,
  depFn,
  depPrimitive,
  depExports,
  depFnRequire,
  dualLib,
  cjsGlobals,
  testNodeBuiltins,
  testExternalFalsyPrimitive,
}
