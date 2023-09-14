import { Label } from "@radix-ui/react-label";
import { Separator } from "@radix-ui/react-separator";
import { FileVideo, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from '@ffmpeg/util'
import { api } from "@/lib/axios";

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

const statusMessages = {
  converting: 'Convertendo...',
  generating: 'Transcrevendo...',
  uploading: 'Carregando...',
  success: 'Sucesso!',
}

interface VideoInputFormProps {
  onVideoUploaded: (id: string) => void
}


export function VideoInputForm (props: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('waiting')
  const [progressPercent, setProgressPercent] = useState(0)

  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.currentTarget

    if (!files) {
      return
    }

    const selectedFile = files[0]

    setVideoFile(selectedFile)
  }

  const convertVideoToAudio =  async (video: File) => {
    console.log('Convert started.')

    const ffmpeg = await getFFmpeg()

    // envia o video pro ffmpeg
    await ffmpeg.writeFile('input.mp4', await fetchFile(video))

    ffmpeg.on("progress", progress => {
      setProgressPercent(Math.round(progress.progress * 100))
      console.log('Convert progress: ' + Math.round(progress.progress * 100))
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3'
    ])

    // pegando o audio já convertido
    const data = await ffmpeg.readFile('output.mp3')

    // convertendo o data do ffmpeg p/ criar um objeto js
    const audioFileBlob = new Blob([data], { type: 'audio/mpeg'})
    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg',
    })

    return audioFile
  }

  const handleUploadVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const prompt = promptInputRef.current?.value

    if (!videoFile) {
      return
    }

    setStatus('converting')

    // converter em áudio
    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()

    data.append('file', audioFile)

    setStatus('uploading')

    const response = await api.post('/videos', data)

    const videoId = response.data.video.id

    setStatus('generating')

    // gerando a transcrição
    await api.post(`/videos/${videoId}/transcription`, {
      prompt,
    })

    setStatus('success')

    props.onVideoUploaded(videoId)
  }

  const previewURL = useMemo(()=>{
    if (!videoFile) {
      return null
    }

    return URL.createObjectURL(videoFile)
  }, [videoFile])

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
      <label
        htmlFor="video"
        className="overflow-hidden relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
      >
        {previewURL ? (
          <video src={previewURL} controls={false} className="pointer-events-none absolute inset-0" />
        ) : (
          <>
            <FileVideo className="w-4 h-4" />
            Selecione um vídeo
          </>
        )}
      </label>

      <input type="file" id="video" accept="video/mp4" className="sr-only" onChange={handleFileSelected} />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          disabled={status !== 'waiting'}
          ref={promptInputRef}
          id="transcription_prompt"
          className="h-20 resize-none leading-relaxed"
          placeholder="Inclua palavras-chave mencionadas no vídeo separadas por vírgula (,)"
        />
      </div>

      <Button 
        data-success={status === 'success'}
        disabled={status !== 'waiting'} 
        type="submit" 
        className="w-full data-[success=true]:bg-emerald-600 data-[success=true]:text-white data-[success=true]:opacity-100"
      >
        {
          status === 'waiting' ? (
            <>
              Carregar vídeo
              <Upload className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              {statusMessages[status]} {''}
              {
                status !== 'success' && `${progressPercent}%`
              }
            </>
          )
        }
      </Button>
    </form>
  );
}
