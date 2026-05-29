let serverValue = 0

export async function readExportAllServerValue() {
  return serverValue
}

export async function incrementExportAllServerValue() {
  serverValue++
}

export async function getExportAllClientValue() {
  return 'export-all-client'
}
