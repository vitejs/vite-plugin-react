export async function direct() {}

let indirect = async () => {}
export { indirect }

consume(direct, indirect)
