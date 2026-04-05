export type ConfidenceLevel = "unverified" | "low" | "medium" | "high" | "verified"

export interface ConfidenceBreakdown {
  base: number
  corroboration: number
  verification: number
  disputePenalty: number
}

export interface ConfidenceResult {
  score: number
  level: ConfidenceLevel
  breakdown: ConfidenceBreakdown
}

const CORROBORATION_POINTS = [20, 15, 10] // first 3 corroborations
const CORROBORATION_EXTRA = 5 // 4th+ each
const CORROBORATION_CAP = 60

const DISPUTE_PENALTIES: Record<string, number> = {
  inaccurate: 5,
  misleading: 10,
  fabricated: 15,
}

function getLevel(score: number): ConfidenceLevel {
  if (score <= 20) return "unverified"
  if (score <= 40) return "low"
  if (score <= 60) return "medium"
  if (score <= 80) return "high"
  return "verified"
}

export function computeConfidence(params: {
  corroborationCount: number
  disputeCount: number
  worldIdVerified: boolean
  onChainVerified: boolean
  source: string | null
  disputeReasons?: string[]
}): ConfidenceResult {
  const base = 20

  // Corroboration bonus (diminishing returns)
  let corroboration = 0
  for (let i = 0; i < params.corroborationCount; i++) {
    corroboration += CORROBORATION_POINTS[i] ?? CORROBORATION_EXTRA
  }
  corroboration = Math.min(corroboration, CORROBORATION_CAP)

  // Verification bonuses
  let verification = 0
  if (params.worldIdVerified) verification += 10
  if (params.onChainVerified) verification += 5
  if (params.source && params.source !== "eyewitness") {
    try {
      new URL(params.source)
      verification += 5
    } catch {
      // not a URL, no bonus
    }
  }

  // Dispute penalty
  let disputePenalty = 0
  if (params.disputeReasons && params.disputeReasons.length > 0) {
    for (const reason of params.disputeReasons) {
      disputePenalty += DISPUTE_PENALTIES[reason] ?? 5
    }
  } else {
    // Fallback: use count with default penalty
    disputePenalty = params.disputeCount * 5
  }

  const raw = base + corroboration + verification - disputePenalty
  const score = Math.max(5, Math.min(100, raw))

  return {
    score,
    level: getLevel(score),
    breakdown: { base, corroboration, verification, disputePenalty },
  }
}
