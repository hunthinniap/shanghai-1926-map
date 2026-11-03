import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {auditApprovedHeritageMap} from './audit-map.mjs'
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../../..')
const result=await auditApprovedHeritageMap(root)
if(process.argv.includes('--write'))await fs.writeFile(path.join(dir,'validation.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result,null,2))
