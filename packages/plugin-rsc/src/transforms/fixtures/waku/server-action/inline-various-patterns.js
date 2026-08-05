const actions = {
  log: async (mesg) => {
    'use server'
    console.log('%s', mesg)
  },
}

async function log2(mesg) {
  'use server'
  console.log('%s', mesg)
}

const log3 = async function (mesg) {
  'use server'
  console.log('%s', mesg)
}

const log4 = async (mesg) => {
  'use server'
  console.log('%s', mesg)
}

const defaultFn = async function (mesg) {
  'use server'
  console.log('%s', mesg)
}

export default defaultFn
