const previewOrigin = 'https://trakealo-app-development.v0.build'

function normalizeOrigin(value: string | undefined, addHttps = false) {
  if (!value) return undefined
  try {
    const normalized = addHttps && !value.startsWith('http') ? `https://${value}` : value
    return new URL(normalized).origin
  } catch {
    return undefined
  }
}

export function getTrustedOrigins() {
  const origins = new Set<string>()
  const configured = [process.env.BETTER_AUTH_URL]

  if (process.env.NODE_ENV === 'development') {
    configured.push(
      'http://localhost:3000',
      process.env.V0_RUNTIME_URL,
      process.env.V0_DEV_APP_URL,
      process.env.V0_BUILD_URL,
      process.env.V0_SANDBOX_URL,
      previewOrigin,
    )
  } else {
    configured.push(process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL)
  }

  for (const value of configured) {
    const origin = normalizeOrigin(value, value === process.env.VERCEL_URL || value === process.env.VERCEL_PROJECT_PRODUCTION_URL)
    if (origin) origins.add(origin)
  }

  return [...origins]
}

export function isTrustedRequestOrigin(origin: string | null) {
  if (!origin) return false
  try {
    return getTrustedOrigins().includes(new URL(origin).origin)
  } catch {
    return false
  }
}
