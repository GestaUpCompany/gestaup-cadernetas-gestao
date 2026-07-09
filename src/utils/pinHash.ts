export async function hashPin(pin: string, funcionarioId: string, fazendaId: string): Promise<string> {
  const raw = `${fazendaId}:${funcionarioId}:${pin.trim()}`
  const encoder = new TextEncoder()
  const buffer = encoder.encode(raw)
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(digest))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPin(
  pin: string,
  pinHash: string | null | undefined,
  funcionarioId: string,
  fazendaId: string
): Promise<boolean> {
  if (!pinHash) return false
  const computed = await hashPin(pin, funcionarioId, fazendaId)
  return computed === pinHash
}
