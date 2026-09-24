export type JumpMode = "smooth" | "instant" | "cut";

export interface ScrollOptions {
  mode?: JumpMode;
  duration?: number;
  ease?: "dolly" | "settle";
  focus?: boolean;
  onComplete?: () => void;
}

/** What useMotionScene passes to a scene builder. heroPin, cinema and phoneCinema already include !reduced. */
export interface SceneFlags {
  reduced: boolean;
  desktop: boolean;
  heroPin: boolean;
  cinema: boolean;
  /** MQ.phoneCinema and motion allowed: Work's showcase in its phone layout. */
  phoneCinema: boolean;
  finePointer: boolean;
}

export interface Store<T> {
  get(): T;
  set(patch: Partial<T>): void;
  subscribe(fn: () => void): () => void;
}

/** motionStore's state. reduced = osReduce || userPref === "off". */
export interface MotionState {
  osReduce: boolean;
  userPref: "on" | "off" | null;
  reduced: boolean;
}
