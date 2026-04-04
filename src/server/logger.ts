export function createLogger(prefix?: string) {
  const tag = prefix ?? "app"
  return {
    info(msg: string, data?: Record<string, unknown>) {
      console.log(`[${tag}]`, msg, data ?? "")
    },
    warn(msg: string, data?: Record<string, unknown>) {
      console.warn(`[${tag}]`, msg, data ?? "")
    },
    error(msg: string, data?: Record<string, unknown>) {
      console.error(`[${tag}]`, msg, data ?? "")
    },
  }
}

export type Logger = ReturnType<typeof createLogger>
