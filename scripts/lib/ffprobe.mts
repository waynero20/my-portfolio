import { parseHexdump } from "./ffmpeg-args.mts";
import { run } from "./run.mts";

export interface VideoProbe {
  codecName: string;
  width: number;
  height: number;
  /** Container duration in seconds. */
  duration: number;
  /** The decoder configuration record (avcC / av1C) from the MP4. */
  extradata: Uint8Array;
}

interface FfprobeJson {
  streams?: { codec_name?: string; width?: number; height?: number; extradata?: string }[];
  format?: { duration?: string };
}

/** Reads the first video stream's codec, size, extradata and the container duration with ffprobe. */
export function probeVideo(file: string): VideoProbe {
  const json = JSON.parse(
    run("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=codec_name,width,height,extradata:format=duration",
      "-show_data",
      "-of",
      "json",
      file,
    ]),
  ) as FfprobeJson;
  const stream = json.streams?.[0];
  const duration = Number(json.format?.duration);
  if (!stream?.codec_name || !stream.width || !stream.height || !Number.isFinite(duration)) {
    throw new Error(`ffprobe found no usable video stream in ${file}`);
  }
  return {
    codecName: stream.codec_name,
    width: stream.width,
    height: stream.height,
    duration,
    extradata: parseHexdump(stream.extradata ?? ""),
  };
}
