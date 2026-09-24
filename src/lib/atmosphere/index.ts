// The atmosphere singleton: the one API islands call to steer the haze. It has no renderer import,
// never touches the DOM, and is safe to import on the server. Until a renderer attaches (M5), every
// call is a cheap no-op that remembers the latest value per call (ripples are queued, max 4);
// _attach(sink) replays that state onto the sink, then calls are forwarded straight to it.

import type { AtmosphereSink, AtmosphereStatus } from "@/lib/types";

export type { AtmosphereCue, AtmosphereCueName } from "@/lib/types";

interface Atmosphere extends AtmosphereSink {
  getStatus(): AtmosphereStatus;
  subscribe(listener: () => void): () => void;
  /** Called by the renderer once it has loaded. A later call replaces the sink and replays again. */
  _attach(sink: AtmosphereSink): void;
}

type Args<M extends keyof AtmosphereSink> = Parameters<AtmosphereSink[M]>;

const MAX_QUEUED_RIPPLES = 4;

let sink: AtmosphereSink | null = null;
let status: AtmosphereStatus = "idle";
const listeners = new Set<() => void>();

/** The latest arguments of each stateful call, kept even after attach so a new sink can catch up. */
const latest: {
  setCue?: Args<"setCue">;
  setDolly?: Args<"setDolly">;
  trackScreen?: Args<"trackScreen">;
  setCovered?: Args<"setCovered">;
  setAmbient?: Args<"setAmbient">;
} = {};

/** Ripples made before attach. They are transient, so they are delivered once and never kept. */
const queuedRipples: Args<"ripple">[] = [];

function replay(target: AtmosphereSink): void {
  if (latest.setCue) target.setCue(...latest.setCue);
  if (latest.setDolly) target.setDolly(...latest.setDolly);
  if (latest.trackScreen) target.trackScreen(...latest.trackScreen);
  if (latest.setCovered) target.setCovered(...latest.setCovered);
  if (latest.setAmbient) target.setAmbient(...latest.setAmbient);
  for (const ripple of queuedRipples.splice(0)) target.ripple(...ripple);
}

export const atmosphere: Atmosphere = {
  setCue(...args) {
    latest.setCue = args;
    sink?.setCue(...args);
  },
  setDolly(...args) {
    latest.setDolly = args;
    sink?.setDolly(...args);
  },
  trackScreen(...args) {
    latest.trackScreen = args;
    sink?.trackScreen(...args);
  },
  setCovered(...args) {
    latest.setCovered = args;
    sink?.setCovered(...args);
  },
  setAmbient(...args) {
    latest.setAmbient = args;
    sink?.setAmbient(...args);
  },
  ripple(...args) {
    if (sink) {
      sink.ripple(...args);
      return;
    }
    queuedRipples.push(args);
    if (queuedRipples.length > MAX_QUEUED_RIPPLES) queuedRipples.shift();
  },
  getStatus: () => status,
  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  _attach(next) {
    sink = next;
    replay(next);
    if (status === "webgl") return;
    status = "webgl";
    for (const listener of [...listeners]) listener();
  },
};
