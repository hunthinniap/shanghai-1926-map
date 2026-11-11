import readline from 'node:readline'
import { reviewAmapCandidates } from './lib/amap-candidate-review.mjs'
for await (const line of readline.createInterface({ input: process.stdin })) {
  try { const input = JSON.parse(line); console.log(JSON.stringify(reviewAmapCandidates(input.target, input.candidates))) }
  catch (error) { console.log(JSON.stringify({ error: error.message })) }
}
