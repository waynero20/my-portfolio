// The commit and date of this build, for the end credits. next.config.ts sets both env values at
// build time, and Next inlines them. `year` (for the ©) comes from the build date, so no component
// has to call new Date() while rendering.

const BUILD_DATE = process.env.BUILD_DATE ?? "";

export const BUILD_INFO = {
  sha: process.env.BUILD_SHA ?? "local",
  date: BUILD_DATE,
  year: BUILD_DATE.slice(0, 4) || String(new Date().getUTCFullYear()),
} as const;
