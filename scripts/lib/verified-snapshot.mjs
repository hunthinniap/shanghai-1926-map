import {createHash} from 'node:crypto'
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
/** Recover only checkout-added CRLFs, and only if the original length AND hash match. */
export function verifiedTextSnapshot(bytes,source){
 const matches=value=>value.length===source.byteLength&&hash(value)===source.sha256
 if(matches(bytes))return bytes
 const canonical=Buffer.from(bytes.toString('utf8').replaceAll('\r\n','\n'))
 if(matches(canonical))return canonical
 throw new Error(`Source snapshot checksum mismatch: ${source.localPath??source.url??'unknown source'}`)
}
