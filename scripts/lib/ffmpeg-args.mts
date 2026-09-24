/** Pure builders for the ffmpeg command lines and the codec strings the asset scripts use. */

export type Fit = "cover" | "contain";
export type VideoCodec = "h264" | "av1";

export interface SourceFrame {
  width: number;
  height: number;
  /** Rows of screen-recording chrome (the macOS menu-bar strip) dropped from the top before fitting. */
  cropTop: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CropRect extends Size {
  x: number;
  y: number;
}

export const OUTPUT_ASPECT = 16 / 10;
const OUTPUT_FPS = 30;

const roundEven = (n: number): number => Math.round(n / 2) * 2;
const floorEven = (n: number): number => Math.floor(n / 2) * 2;

/**
 * The source region kept for a fit. `cover` is 16:10 anchored at the top (below `cropTop`) and centred
 * horizontally; `contain` keeps everything below `cropTop`. Even offsets and sizes keep yuv420p chroma aligned.
 */
export function sourceCrop(src: SourceFrame, fit: Fit): CropRect {
  const available = src.height - src.cropTop;
  if (fit === "contain") return { width: src.width, height: available, x: 0, y: src.cropTop };
  if (src.width / available > OUTPUT_ASPECT) {
    const height = floorEven(available);
    const width = roundEven(height * OUTPUT_ASPECT);
    return { width, height, x: roundEven((src.width - width) / 2), y: src.cropTop };
  }
  const height = Math.min(roundEven(src.width / OUTPUT_ASPECT), floorEven(available));
  return { width: src.width, height, x: 0, y: src.cropTop };
}

/** The encoded frame size at `width`: 16:10 for cover, the kept region's aspect for contain (even height). */
export function outputSize(src: SourceFrame, fit: Fit, width: number): Size {
  if (fit === "cover") return { width, height: roundEven(width / OUTPUT_ASPECT) };
  const crop = sourceCrop(src, fit);
  return { width, height: roundEven((width * crop.height) / crop.width) };
}

function cropAndScale(src: SourceFrame, fit: Fit, width: number, scaleOptions: string): string {
  const c = sourceCrop(src, fit);
  const out = outputSize(src, fit, width);
  return `crop=${c.width}:${c.height}:${c.x}:${c.y},scale=${out.width}:${out.height}:flags=lanczos${scaleOptions},setsar=1`;
}

/** -vf chain for an encode: crop, scale, 30 fps, yuv420p. */
export function videoFilter(src: SourceFrame, fit: Fit, width: number): string {
  return `${cropAndScale(src, fit, width, "")},fps=${OUTPUT_FPS},format=yuv420p`;
}

/** -vf chain for a poster still: the video's crop and size, converted from bt709 YUV to full-range RGB. */
export function posterFilter(src: SourceFrame, fit: Fit, width: number): string {
  return `${cropAndScale(src, fit, width, ":in_color_matrix=bt709:in_range=tv:out_range=pc")},format=rgb24`;
}

export interface EncodeOptions {
  input: string;
  /** Seconds skipped at the start of the input (an input `-ss`: the output's timeline starts there). */
  startAt?: number;
  output: string;
  filter: string;
  codec: VideoCodec;
  crf: number;
}

const ENCODER_ARGS: Record<VideoCodec, string[]> = {
  h264: ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high"],
  av1: ["-c:v", "libsvtav1", "-preset", "5"],
};

/** A silent, 30 fps CFR, bt709-tagged, faststart MP4 encode. Metadata (capture dates, device) is stripped. */
export function encodeArgs(o: EncodeOptions): string[] {
  return [
    "-y",
    "-hide_banner",
    "-nostats",
    "-loglevel",
    "error",
    ...(o.startAt ? ["-ss", String(o.startAt)] : []),
    "-i",
    o.input,
    "-map",
    "0:v:0",
    "-an",
    "-map_metadata",
    "-1",
    "-vf",
    o.filter,
    "-fps_mode",
    "cfr",
    ...ENCODER_ARGS[o.codec],
    "-crf",
    String(o.crf),
    "-pix_fmt",
    "yuv420p",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    "-colorspace",
    "bt709",
    "-color_range",
    "tv",
    "-movflags",
    "+faststart",
    o.output,
  ];
}

/** One PNG frame at `seconds`, written to stdout. */
export function posterFrameArgs(o: { input: string; seconds: number; filter: string }): string[] {
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    String(o.seconds),
    "-i",
    o.input,
    "-frames:v",
    "1",
    "-vf",
    o.filter,
    "-c:v",
    "png",
    "-f",
    "image2pipe",
    "-",
  ];
}

/** Raw rgb24 frames sampled at `fps`, area-averaged down to a width×height grid, written to stdout. */
export function ambilightArgs(o: { input: string; fps: number; width: number; height: number }): string[] {
  const scale = `scale=${o.width}:${o.height}:flags=area:in_color_matrix=bt709:in_range=tv:out_range=pc`;
  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    o.input,
    "-an",
    "-vf",
    `fps=${o.fps},${scale},format=rgb24`,
    "-f",
    "rawvideo",
    "-",
  ];
}

/** The hex region of one `ffprobe -show_data` line: offset, colon, then 2-byte groups up to the ASCII column. */
const HEXDUMP_LINE = /^[0-9a-f]{8}: ((?:[0-9a-f]{2}){1,2}(?: (?:[0-9a-f]{2}){1,2})*)/i;

/** Bytes from ffprobe's `-show_data` hexdump (used for the stream's extradata). */
export function parseHexdump(dump: string): Uint8Array {
  const hex = dump
    .split("\n")
    .map((line) => HEXDUMP_LINE.exec(line)?.[1] ?? "")
    .join("")
    .replaceAll(" ", "");
  return Uint8Array.from(hex.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
}

const hexByte = (n: number): string => n.toString(16).toUpperCase().padStart(2, "0");
const twoDigits = (n: number): string => String(n).padStart(2, "0");

/**
 * RFC 6381 codec string from the decoder configuration record in the MP4:
 * avcC → `avc1.PPCCLL`; av1C → `av01.P.LLT.DD` (profile, level, tier, bit depth).
 */
export function codecString(codec: VideoCodec, config: Uint8Array): string {
  if (codec === "h264") {
    if (config.length < 4 || config[0] !== 0x01) throw new Error("Expected an avcC record (configurationVersion 1)");
    return `avc1.${hexByte(config[1])}${hexByte(config[2])}${hexByte(config[3])}`;
  }
  if (config.length < 3 || config[0] !== 0x81) throw new Error("Expected an av1C record (marker 1, version 1)");
  const profile = config[1] >> 5;
  const level = config[1] & 0x1f;
  const tier = config[2] & 0x80 ? "H" : "M";
  const highBitDepth = (config[2] & 0x40) !== 0;
  const twelveBit = (config[2] & 0x20) !== 0;
  const bitDepth = highBitDepth ? (profile === 2 && twelveBit ? 12 : 10) : 8;
  return `av01.${profile}.${twoDigits(level)}${tier}.${twoDigits(bitDepth)}`;
}

/** `video/mp4; codecs="…"` for a <source type>. */
export function mimeType(codec: VideoCodec, config: Uint8Array): string {
  return `video/mp4; codecs="${codecString(codec, config)}"`;
}
