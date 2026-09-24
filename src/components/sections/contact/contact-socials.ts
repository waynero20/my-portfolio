import { SOCIALS } from "@/lib/data";

const CONTACT_SOCIAL_IDS = ["github", "linkedin", "instagram", "facebook"] as const;

/** The profiles Contact and the end credits link to, in this order (Gravatar stays in data, unlisted). */
export const CONTACT_SOCIALS = CONTACT_SOCIAL_IDS.map((id) => SOCIALS.find((social) => social.id === id)).filter(
  (social) => social !== undefined,
);
