/**
 * Voice transcription helper using AWS Transcribe
 *
 * Frontend implementation guide:
 * 1. Capture audio using MediaRecorder API
 * 2. Upload audio to storage (e.g., S3) to get URL
 * 3. Call transcription with the URL
 * 
 * Example usage:
 * ```tsx
 * // Frontend component
 * const transcribeMutation = trpc.voice.transcribe.useMutation({
 *   onSuccess: (data) => {
 *     console.log(data.text); // Full transcription
 *     console.log(data.language); // Detected language
 *     console.log(data.segments); // Timestamped segments
 *   }
 * });
 * 
 * // After uploading audio to storage
 * transcribeMutation.mutate({
 *   audioUrl: uploadedAudioUrl,
 *   language: 'en', // optional
 *   prompt: 'Transcribe the meeting' // optional (not used by AWS Transcribe)
 * });
 * ```
 */
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  TranscriptionJobStatus,
  LanguageCode,
} from "@aws-sdk/client-transcribe";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

export type TranscribeOptions = {
  audioUrl: string;
  language?: string;
  prompt?: string;
};

export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse;

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

type AWSConfig = {
  transcribeClient: TranscribeClient;
  s3Client: S3Client;
  bucket: string;
  region: string;
};

let cachedConfig: AWSConfig | null = null;

function getAWSConfig(): AWSConfig | TranscriptionError {
  if (cachedConfig) return cachedConfig;

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    return {
      error: "AWS credentials not configured for voice transcription",
      code: "SERVICE_ERROR",
      details: "Set AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY",
    };
  }

  const credentials = { accessKeyId, secretAccessKey };

  const transcribeClient = new TranscribeClient({ region, credentials });
  const s3Client = new S3Client({ region, credentials });

  cachedConfig = { transcribeClient, s3Client, bucket, region };
  return cachedConfig;
}

function mapLanguageCode(langCode?: string): LanguageCode | undefined {
  if (!langCode) return undefined;

  const langMap: Record<string, LanguageCode> = {
    en: LanguageCode.EN_US,
    "en-us": LanguageCode.EN_US,
    "en-gb": LanguageCode.EN_GB,
    "en-au": LanguageCode.EN_AU,
    es: LanguageCode.ES_ES,
    "es-es": LanguageCode.ES_ES,
    "es-us": LanguageCode.ES_US,
    fr: LanguageCode.FR_FR,
    "fr-fr": LanguageCode.FR_FR,
    de: LanguageCode.DE_DE,
    "de-de": LanguageCode.DE_DE,
    it: LanguageCode.IT_IT,
    "it-it": LanguageCode.IT_IT,
    pt: LanguageCode.PT_BR,
    "pt-br": LanguageCode.PT_BR,
    "pt-pt": LanguageCode.PT_PT,
    ja: LanguageCode.JA_JP,
    "ja-jp": LanguageCode.JA_JP,
    ko: LanguageCode.KO_KR,
    "ko-kr": LanguageCode.KO_KR,
    zh: LanguageCode.ZH_CN,
    "zh-cn": LanguageCode.ZH_CN,
    "zh-tw": LanguageCode.ZH_TW,
    ar: LanguageCode.AR_SA,
    "ar-sa": LanguageCode.AR_SA,
    hi: LanguageCode.HI_IN,
    "hi-in": LanguageCode.HI_IN,
    nl: LanguageCode.NL_NL,
    "nl-nl": LanguageCode.NL_NL,
    ru: LanguageCode.RU_RU,
    "ru-ru": LanguageCode.RU_RU,
    tr: LanguageCode.TR_TR,
    "tr-tr": LanguageCode.TR_TR,
    sv: LanguageCode.SV_SE,
    "sv-se": LanguageCode.SV_SE,
    da: LanguageCode.DA_DK,
    "da-dk": LanguageCode.DA_DK,
    fi: LanguageCode.FI_FI,
    "fi-fi": LanguageCode.FI_FI,
  };

  const key = langCode.toLowerCase();
  return langMap[key];
}

function getMediaFormat(mimeType: string): "mp3" | "mp4" | "wav" | "flac" | "ogg" | "webm" | undefined {
  const formatMap: Record<string, "mp3" | "mp4" | "wav" | "flac" | "ogg" | "webm"> = {
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/m4a": "mp4",
    "video/webm": "webm",
  };
  return formatMap[mimeType];
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    const config = getAWSConfig();
    if ("error" in config) return config;

    const { transcribeClient, s3Client, bucket, region } = config;

    let audioBuffer: Buffer;
    let mimeType: string;
    try {
      const response = await fetch(options.audioUrl);
      if (!response.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      audioBuffer = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get("content-type") || "audio/mpeg";

      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 500) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 500MB`,
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }

    const mediaFormat = getMediaFormat(mimeType);
    if (!mediaFormat) {
      return {
        error: "Unsupported audio format",
        code: "INVALID_FORMAT",
        details: `MIME type ${mimeType} is not supported by AWS Transcribe`,
      };
    }

    const jobId = `transcription-${nanoid()}`;
    const s3Key = `transcriptions/${jobId}.${mediaFormat}`;

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: audioBuffer,
          ContentType: mimeType,
        })
      );
    } catch (error) {
      return {
        error: "Failed to upload audio to S3",
        code: "UPLOAD_FAILED",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }

    const mediaFileUri = `s3://${bucket}/${s3Key}`;
    const languageCode = mapLanguageCode(options.language);

    try {
      await transcribeClient.send(
        new StartTranscriptionJobCommand({
          TranscriptionJobName: jobId,
          LanguageCode: languageCode || LanguageCode.EN_US,
          IdentifyLanguage: !languageCode,
          MediaFormat: mediaFormat,
          Media: { MediaFileUri: mediaFileUri },
          OutputBucketName: bucket,
          OutputKey: `transcriptions/${jobId}-output.json`,
        })
      );
    } catch (error) {
      return {
        error: "Failed to start transcription job",
        code: "TRANSCRIPTION_FAILED",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }

    const maxAttempts = 60;
    const pollInterval = 2000;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      await sleep(pollInterval);

      try {
        const jobResult = await transcribeClient.send(
          new GetTranscriptionJobCommand({ TranscriptionJobName: jobId })
        );

        const job = jobResult.TranscriptionJob;
        if (!job) continue;

        if (job.TranscriptionJobStatus === TranscriptionJobStatus.COMPLETED) {
          const transcriptUrl = job.Transcript?.TranscriptFileUri;
          if (!transcriptUrl) {
            return {
              error: "Transcription completed but no transcript URL available",
              code: "TRANSCRIPTION_FAILED",
            };
          }

          const transcriptResponse = await fetch(transcriptUrl);
          if (!transcriptResponse.ok) {
            return {
              error: "Failed to fetch transcription result",
              code: "TRANSCRIPTION_FAILED",
              details: `HTTP ${transcriptResponse.status}`,
            };
          }

          const transcriptData = await transcriptResponse.json();
          const results = transcriptData.results;

          const fullText = results.transcripts
            ?.map((t: { transcript: string }) => t.transcript)
            .join(" ") || "";

          const segments: WhisperSegment[] = [];
          let segmentId = 0;

          if (results.items) {
            let currentSegment: Partial<WhisperSegment> | null = null;

            for (const item of results.items) {
              if (item.type === "pronunciation") {
                const startTime = parseFloat(item.start_time || "0");
                const endTime = parseFloat(item.end_time || "0");
                const content = item.alternatives?.[0]?.content || "";

                if (!currentSegment || startTime - (currentSegment.end || 0) > 1) {
                  if (currentSegment && currentSegment.text) {
                    segments.push(currentSegment as WhisperSegment);
                  }
                  currentSegment = {
                    id: segmentId++,
                    seek: 0,
                    start: startTime,
                    end: endTime,
                    text: content,
                    tokens: [],
                    temperature: 0,
                    avg_logprob: 0,
                    compression_ratio: 0,
                    no_speech_prob: 0,
                  };
                } else {
                  currentSegment.text = (currentSegment.text || "") + " " + content;
                  currentSegment.end = endTime;
                }
              } else if (item.type === "punctuation" && currentSegment) {
                currentSegment.text = (currentSegment.text || "") + (item.alternatives?.[0]?.content || "");
              }
            }

            if (currentSegment && currentSegment.text) {
              segments.push(currentSegment as WhisperSegment);
            }
          }

          const detectedLang = job.LanguageCode || languageCode || "en-US";
          const duration = segments.length > 0
            ? segments[segments.length - 1].end
            : 0;

          return {
            task: "transcribe",
            language: detectedLang.split("-")[0],
            duration,
            text: fullText,
            segments,
          };
        }

        if (job.TranscriptionJobStatus === TranscriptionJobStatus.FAILED) {
          return {
            error: "Transcription job failed",
            code: "TRANSCRIPTION_FAILED",
            details: job.FailureReason,
          };
        }
      } catch (error) {
        return {
          error: "Failed to check transcription job status",
          code: "SERVICE_ERROR",
          details: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    return {
      error: "Transcription job timed out",
      code: "TRANSCRIPTION_FAILED",
      details: "Job did not complete within the expected time",
    };
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
