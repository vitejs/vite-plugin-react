function outer1() {
  const x = {}
  async function action() {
    'use server'
    return x?.y.z
  }
}

function outer2() {
  const x = {}
  async function action() {
    'use server'
    return x.y?.z
  }
}

function outer3() {
  const x = {}
  async function action() {
    'use server'
    return x?.y?.z
  }
}

function outer4() {
  const x = {}
  const y = 'y'
  async function action() {
    'use server'
    return x[y].z
  }
}

function outer5() {
  const x = {}
  const k = 'k'
  async function action() {
    'use server'
    return x.y[k]
  }
}

function outer6() {
  const x = {}
  const y = 'y'
  async function action() {
    'use server'
    return x[y]?.z
  }
}

function outer7() {
  const a = {}
  async function action() {
    'use server'
    return a.b?.c
  }
}

function outer8() {
  const a = {}
  const b = 'b'
  async function action() {
    'use server'
    return a[b].c
  }
}
