export interface QualitySearchOptions {
  /** The best-quality integer setting allowed (the lowest CRF, or the highest image quality). */
  best: number;
  /** The worst-quality integer setting allowed. The search rejects if even this is over budget. */
  worst: number;
  /** Maximum output size in bytes. */
  budget: number;
  /** Encodes at a setting and returns (or resolves to) the output size in bytes. Called at most once per setting. */
  measure: (setting: number) => number | Promise<number>;
}

export interface QualitySearchResult {
  setting: number;
  bytes: number;
  /** Every setting measured, in order. */
  tried: number[];
}

/**
 * Binary-searches the settings from `best` to `worst` for the best one whose output fits `budget`,
 * assuming size shrinks as quality drops. It only returns a setting it has measured within budget.
 */
export async function searchQuality({ best, worst, budget, measure }: QualitySearchOptions): Promise<QualitySearchResult> {
  if (!Number.isInteger(best) || !Number.isInteger(worst)) throw new Error("Quality settings must be integers");
  const step = worst >= best ? 1 : -1;
  const settingAt = (k: number): number => best + k * step;
  const sizes = new Map<number, number>();
  const bytesAt = async (setting: number): Promise<number> => {
    const known = sizes.get(setting);
    if (known !== undefined) return known;
    const bytes = await measure(setting);
    sizes.set(setting, bytes);
    return bytes;
  };

  // Lower-bound search for the first index that fits; `hi` only ever moves onto a measured fit.
  let lo = 0;
  let hi = Math.abs(worst - best);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((await bytesAt(settingAt(mid))) <= budget) hi = mid;
    else lo = mid + 1;
  }

  const setting = settingAt(lo);
  const bytes = await bytesAt(setting);
  if (bytes > budget) {
    throw new Error(`No setting from ${best} to ${worst} fits: ${setting} gives ${bytes} bytes, over the ${budget}-byte budget`);
  }
  return { setting, bytes, tried: [...sizes.keys()] };
}
