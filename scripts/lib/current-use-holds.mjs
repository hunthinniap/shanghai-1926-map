// Research holds take precedence over every source of modern-use enrichment.
// Helpers return copies so callers can retain their original audit inputs.
export function clearCurrentUse(properties) {
  return Object.fromEntries(Object.entries(properties).filter(([key]) =>
    !key.startsWith('currentUse') && !['currentNameZh', 'currentAddress'].includes(key)))
}

export function findCurrentUseHold(holds, properties) {
  const currentGroups = new Set([properties.featureGroupId, properties.id].filter(Boolean))
  const legacyGroups = new Set(properties.legacyFeatureGroupIds ?? [])
  const memberIds = new Set((properties.sourceRecordIds ?? []).map(String))
  return holds.find((hold) => {
    if (currentGroups.has(hold.featureGroupId)) return true
    const holdIds = hold.sourceRecordIds ?? []
    const sharedMember = holdIds.some((id) => memberIds.has(String(id)))
    if (sharedMember) return true
    // A legacy name can be shared by groups that were later split. When both
    // sides have member guards, a disjoint group must not inherit that hold.
    return legacyGroups.has(hold.featureGroupId) && (!memberIds.size || !holdIds.length)
  })
}

export function applyCurrentUseHold(auditRecord, hold) {
  const result = {
    ...auditRecord,
    status: 'needs-review-research',
    queries: [],
    searchResultCount: 0,
    reviewHold: {
      featureGroupId: hold.featureGroupId,
      sourceRecordIds: [...hold.sourceRecordIds],
      reason: hold.reason,
      sourceUrls: [...hold.sourceUrls],
      reviewedAt: hold.reviewedAt,
      reviewRef: hold.reviewRef,
    },
  }
  delete result.accepted
  delete result.reviewCandidate
  delete result.nearestSearchResult
  return result
}
