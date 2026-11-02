'use server'

export async function sharedProgressiveAction(
  callback: (formData: FormData) => Promise<unknown>,
  formData: FormData,
) {
  await callback(formData)
}
