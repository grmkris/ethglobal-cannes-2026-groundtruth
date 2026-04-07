export {
  EAS_CONTRACT_ADDRESS,
  SCHEMA_REGISTRY_ADDRESS,
  EAS_DOMAIN,
  SEPOLIA_EAS_CONTRACT_ADDRESS,
  SEPOLIA_SCHEMA_REGISTRY_ADDRESS,
  ZERO_ADDRESS,
  ZERO_BYTES32,
} from "./addresses"

export { easAbi, schemaRegistryAbi } from "./abi"

export {
  CORROBORATION_SCHEMA,
  DISPUTE_SCHEMA,
  SOURCE_CLAIM_SCHEMA,
  AGENT_MANDATE_SCHEMA,
  GROUND_TRUTH_SCHEMAS,
  getSchemaByName,
  getSchemaByUid,
  DISPUTE_REASON_CODES,
  type DisputeReasonCode,
  type GroundTruthSchema,
  type GroundTruthSchemaName,
} from "./schemas"

export { encodeSchemaData } from "./encode"
export { computeAttestationUid } from "./uid"

export {
  buildOffchainAttestation,
  EAS_ATTEST_TYPES,
  type BuildAttestationParams,
  type UnsignedAttestation,
} from "./offchain"

export {
  verifyOffchainAttestation,
  type VerifyOffchainAttestationParams,
} from "./verify"

export { buildOnchainAttestRequest } from "./onchain"
