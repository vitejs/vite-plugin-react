function outer(config, err) {
  async function action() {
    'use server'
    try {
      return config.value
    } catch (err) {
      return err.message
    }
  }
}
