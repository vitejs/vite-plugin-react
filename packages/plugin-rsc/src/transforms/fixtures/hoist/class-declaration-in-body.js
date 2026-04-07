function outer(config) {
  async function action() {
    'use server'
    class Helper {
      run() {
        return config.value
      }
    }
    return new Helper().run()
  }
}
