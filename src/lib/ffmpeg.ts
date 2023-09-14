import { FFmpeg } from '@ffmpeg/ffmpeg'

import coreURL from '../ffmpeg/ffmpeg-core.js?url'
import wasmURL from '../ffmpeg/ffmpeg-core.wasm?url'
import workerURL from '../ffmpeg/ffmpeg-worker.js?url'

//só vai carregar qd for usar, pq é pesada
let ffmpeg: FFmpeg | null

export async function getFFmpeg() {
  // se ja carregou, retorna, pra n precisar carregar de novo
  if (ffmpeg) {
    return ffmpeg
  }

  // se o ffmpeg ainda não carregou, força o carregamento
  ffmpeg = new FFmpeg()

  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      coreURL,
      wasmURL,
      workerURL,
    })
  }

  return ffmpeg
}