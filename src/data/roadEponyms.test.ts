import { describe, expect, it } from 'vitest'
import { getRoadEponym } from './roadEponyms'

describe('road eponym profiles', () => {
  it('finds a confirmed French-concession eponym', () => {
    expect(getRoadEponym('Avenue Joffre')).toMatchObject({
      name: 'Joseph Joffre',
      sourceLabel: 'Wikipedia · 英文',
    })
  })

  it('finds a confirmed International Settlement eponym', () => {
    expect(getRoadEponym('Hart Road')).toMatchObject({
      name: 'Sir Robert Hart',
    })
  })

  it('does not guess from a non-person road name', () => {
    expect(getRoadEponym('Rue du Consulat')).toBeUndefined()
  })

  it('does not apply a profile to an uncertain person-like name', () => {
    expect(getRoadEponym('Route Gaston Kahn')).toBeUndefined()
  })
})
