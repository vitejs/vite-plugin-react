export async function direct() {}

const indirect = async () => {}
export { indirect }

consume(direct, indirect)
