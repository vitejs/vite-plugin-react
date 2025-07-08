declare global {
  /** replaced by unbuild only in build */
  // eslint-disable-next-line no-var --- top level var has to be var
  var __IS_BUILD__: boolean | void
}

export {}
