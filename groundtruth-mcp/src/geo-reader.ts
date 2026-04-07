// Reads Ground Truth WorldEvent entities from the public Geo PostGraphile endpoint.
//
// Endpoint: https://testnet-api.geobrowser.io/graphql
// No private key required — pure read.
//
// Strategy: filter by typeIds: { in: [WORLD_EVENT_TYPE_ID] }, decode each
// entity's valuesList by propertyId from geo-constants.

import { request } from "graphql-request"
import {
  GEO_GRAPHQL_ENDPOINT,
  PROPERTY_IDS,
  WORLD_EVENT_TYPE_ID,
  isGeoSchemaBootstrapped,
} from "./geo-constants.js"

export type GeoEvent = {
  geoEntityId: string
  spaceIds: string[]
  title: string | null
  description: string | null
  location: { longitude: number; latitude: number } | null
  locationName: string | null
  occurredAt: string | null
  source: string | null
  category: string | null
  severity: string | null
  createdAt: string
  updatedAt: string
}

type GqlValue = {
  propertyId: string
  text?: string | null
  point?: string | null // PostGIS GeoPoint, comma-separated "lng,lat"
  time?: string | null
  datetime?: string | null
  float?: number | null
  integer?: string | null
  boolean?: boolean | null
}

type GqlEntity = {
  id: string
  name: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  spaceIds: string[] | null
  valuesList: GqlValue[]
}

type GqlResponse = {
  entities: GqlEntity[]
}

const QUERY = /* GraphQL */ `
  query GroundTruthEvents($first: Int!, $offset: Int!, $typeId: UUID!) {
    entities(
      first: $first
      offset: $offset
      typeIds: { in: [$typeId] }
      orderBy: CREATED_AT_DESC
    ) {
      id
      name
      description
      createdAt
      updatedAt
      spaceIds
      valuesList(first: 100) {
        propertyId
        text
        point
        time
        datetime
        float
        integer
        boolean
      }
    }
  }
`

/**
 * Parse a PostGIS-style "lng,lat" string into typed coordinates.
 * Returns null on malformed input.
 */
function parsePoint(
  raw: string | null | undefined,
): { longitude: number; latitude: number } | null {
  if (!raw) return null
  const parts = raw.split(",").map((s) => Number(s.trim()))
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null
  return { longitude: parts[0]!, latitude: parts[1]! }
}

function decodeEntity(entity: GqlEntity): GeoEvent {
  const byProp = new Map<string, GqlValue>()
  for (const v of entity.valuesList) {
    byProp.set(v.propertyId, v)
  }

  const get = (key: keyof typeof PROPERTY_IDS) => byProp.get(PROPERTY_IDS[key])

  return {
    geoEntityId: entity.id,
    spaceIds: entity.spaceIds ?? [],
    // title and description are stored on the entity directly via SDK
    // (createEntity name + description), not as custom properties.
    title: entity.name,
    description: entity.description,
    location: parsePoint(get("point")?.point),
    locationName: get("locationName")?.text ?? null,
    occurredAt:
      get("occurredAt")?.datetime ?? get("occurredAt")?.time ?? null,
    source: get("source")?.text ?? null,
    category: get("category")?.text ?? null,
    severity: get("severity")?.text ?? null,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}

/**
 * Query WorldEvent entities from Geo's public knowledge graph.
 * Returns events from ALL Spaces that publish to the canonical type.
 */
export async function queryGeoEvents(opts?: {
  limit?: number
  offset?: number
}): Promise<GeoEvent[]> {
  if (!isGeoSchemaBootstrapped()) {
    throw new Error(
      "Geo schema not bootstrapped — run `bun run scripts/bootstrap-geo.ts` first to generate property/type IDs.",
    )
  }

  const variables = {
    first: Math.min(Math.max(opts?.limit ?? 50, 1), 200),
    offset: Math.max(opts?.offset ?? 0, 0),
    typeId: WORLD_EVENT_TYPE_ID,
  }

  const data = await request<GqlResponse>(GEO_GRAPHQL_ENDPOINT, QUERY, variables)
  return data.entities.map(decodeEntity)
}
