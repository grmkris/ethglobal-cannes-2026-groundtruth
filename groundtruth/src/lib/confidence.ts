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

/**
 * Minimal structural shape we need from an EAS attestation row for
 * confidence scoring. The full `EasAttestation` DB type is acceptable
 * since it's a superset.
 */
export interface ConfidenceAttestation {
  attester: string
  attestationTime: bigint
  chain: number
  isRevoked: boolean
  schemaData: unknown
}

function getLevel(score: number): ConfidenceLevel {
  if (score <= 20) return "unverified"
  if (score <= 40) return "low"
  if (score <= 60) return "medium"
  if (score <= 80) return "high"
  return "verified"
}

/**
 * Weight of a single attestation based on age, on-chain-ness, and
 * revocation state. Age decays linearly over 30 days to a floor of 50%.
 */
function weightAttestation(a: ConfidenceAttestation): number {
  if (a.isRevoked) return 0
  const ageMs = Date.now() - Number(a.attestationTime) * 1000
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  const decay = Math.max(0.5, 1 - ageDays / 60) // floor 0.5 at ~30 days
  // On-chain (promoted) attestations get a small bonus.
  const chainBonus = a.chain > 0 ? 1.25 : 1
  return decay * chainBonus
}

export function computeConfidence(params: {
  corroborationCount: number
  disputeCount: number
  worldIdVerified: boolean
  onChainVerified: boolean
  source: string | null
  disputeReasons?: string[]
  /**
   * If provided, confidence is computed from the attestation list
   * (one weight unit per valid corroboration / dispute) and the
   * corroborationCount / disputeCount fields are ignored.
   */
  corroborationAttestations?: ConfidenceAttestation[]
  disputeAttestations?: ConfidenceAttestation[]
}): ConfidenceResult {
  const base = 20

  // Corroboration bonus — prefer attestation-based count when available.
  let corroboration = 0
  const useAttestations =
    params.corroborationAttestations !== undefined &&
    params.corroborationAttestations.length > 0

  if (useAttestations) {
    // Each valid (unrevoked) corroboration adds up to its position-based
    // points, scaled by its weight.
    const valid = params.corroborationAttestations!
      .filter((a) => !a.isRevoked)
      .sort((a, b) => Number(b.attestationTime) - Number(a.attestationTime))
    for (let i = 0; i < valid.length; i++) {
      const weight = weightAttestation(valid[i]!)
      const basePoints = CORROBORATION_POINTS[i] ?? CORROBORATION_EXTRA
      corroboration += basePoints * weight
    }
  } else {
    for (let i = 0; i < params.corroborationCount; i++) {
      corroboration += CORROBORATION_POINTS[i] ?? CORROBORATION_EXTRA
    }
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

  // Dispute penalty — prefer attestation-based when available.
  let disputePenalty = 0
  if (
    params.disputeAttestations !== undefined &&
    params.disputeAttestations.length > 0
  ) {
    for (const a of params.disputeAttestations.filter((a) => !a.isRevoked)) {
      const weight = weightAttestation(a)
      // Pull reason code from the attestation's structured data if present.
      const reasonCode = (a.schemaData as { reasonCode?: number } | null)?.reasonCode
      const reasonName =
        reasonCode === 3 ? "fabricated" : reasonCode === 2 ? "misleading" : "inaccurate"
      disputePenalty += (DISPUTE_PENALTIES[reasonName] ?? 5) * weight
    }
  } else if (params.disputeReasons && params.disputeReasons.length > 0) {
    for (const reason of params.disputeReasons) {
      disputePenalty += DISPUTE_PENALTIES[reason] ?? 5
    }
  } else {
    // Fallback: use count with default penalty
    disputePenalty = params.disputeCount * 5
  }

  const raw = base + corroboration + verification - disputePenalty
  const score = Math.max(5, Math.min(100, Math.round(raw)))

  return {
    score,
    level: getLevel(score),
    breakdown: {
      base,
      corroboration: Math.round(corroboration),
      verification,
      disputePenalty: Math.round(disputePenalty),
    },
  }
}
