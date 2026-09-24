import type { ReactNode } from "react";

interface Props {
  client: ReactNode;
  team: ReactNode;
}

/**
 * Server-renders both editions' copy. globals.css hides one before first paint from html[data-edition],
 * which BOOT_SCRIPT sets for ?for=team, so the swap costs no JS and no layout shift.
 */
export function EditionSwap({ client, team }: Props) {
  return (
    <>
      <span data-edition-client="">{client}</span>
      <span data-edition-team="">{team}</span>
    </>
  );
}
