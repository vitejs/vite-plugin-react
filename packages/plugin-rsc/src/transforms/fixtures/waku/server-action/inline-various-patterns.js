const actions = {
  log: async (mesg) => {
    'use server'
    console.log(mesg)
  },
}

async function log2(mesg) {
  'use server'
  console.log(mesg)
}

const log3 = async function (mesg) {
  'use server'
  console.log(mesg)
}

const log4 = async (mesg) => {
  'use server'
  console.log(mesg)
}

const defaultFn = async function (mesg) {
  'use server'
  console.log(mesg)
}

export default defaultFn
