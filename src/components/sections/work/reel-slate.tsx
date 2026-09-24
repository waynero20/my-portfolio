interface Props {
  category: string;
  market: string | null;
}

/** The mono slate, e.g. "E-COMMERCE — PH". No reel numbers (Wayne's W12); a null market is left out. */
export function ReelSlate({ category, market }: Props) {
  const slate = [category, market].filter(Boolean).join(" — ");

  return <p className="font-mono text-mono text-muted uppercase">{slate}</p>;
}
