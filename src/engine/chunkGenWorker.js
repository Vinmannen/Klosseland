// ─────────────────────────────────────────────────────────────
//  Klosseland — ChunkGenWorker
//  Runs inside a Web Worker. Generates chunk terrain data
//  off the main thread so the render loop is never blocked.
//
//  Protocol:
//    IN  { type:'init',     seed }
//    IN  { type:'generate', reqId, cx, cz }
//    OUT { type:'done',     reqId, cx, cz, buffer }  (Transferable)
// ─────────────────────────────────────────────────────────────
import { WorldGen } from '../world/WorldGen.js'
import { Chunk }    from '../world/Chunk.js'

let gen = null

self.onmessage = ({ data }) => {
  switch (data.type) {
    case 'init':
      gen = new WorldGen(data.seed, data.halfBlocks ?? Infinity)
      break

    case 'generate': {
      const { reqId, cx, cz } = data
      const chunk = new Chunk(cx, cz)
      gen.generateChunk(chunk)
      // Transfer the ArrayBuffer (zero-copy) back to the main thread
      self.postMessage(
        { type: 'done', reqId, cx, cz, buffer: chunk.data.buffer },
        [chunk.data.buffer],
      )
      break
    }

    default:
      break
  }
}
