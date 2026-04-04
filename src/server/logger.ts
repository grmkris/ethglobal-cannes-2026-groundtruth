export function createLogger(prefix?: string) {
  const tag = prefix ?? "app"
  return {
    info(msg: string, data?: Record<string, unknown>) {
      data ? console.log(`[${tag}]`, msg, data) : console.log(`[${tag}]`, msg)
    },
    warn(msg: string, data?: Record<string, unknown>) {
      data ? console.warn(`[${tag}]`, msg, data) : console.warn(`[${tag}]`, msg)
    },
    error(msg: string, data?: Record<string, unknown>) {
      data ? console.error(`[${tag}]`, msg, data) : console.error(`[${tag}]`, msg)
    },
  }
}

export type Logger = ReturnType<typeof createLogger>
