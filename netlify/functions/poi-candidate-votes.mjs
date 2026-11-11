import { getStore } from '@netlify/blobs'
import dataset from '../../public/data/heritage-poi-review.json' with { type: 'json' }
import { createNetlifyPoiVotesHandler } from '../../scripts/lib/netlify-poi-votes.mjs'

export default createNetlifyPoiVotesHandler({ dataset, getStore })
export const config = { path: '/api/poi-candidate-votes' }
