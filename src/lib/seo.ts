// Structured data for the <head>: Wayne as a Person and his studio as a ProfessionalService.

import { SITE, SOCIALS } from "@/lib/data";

interface JsonLdNode {
  "@type": string;
  "@id": string;
  [property: string]: unknown;
}

interface JsonLdGraph {
  "@context": "https://schema.org";
  "@graph": JsonLdNode[];
}

const PERSON_ID = `${SITE.url}/#person`;

export function buildJsonLd(): JsonLdGraph {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: SITE.name,
        jobTitle: SITE.role,
        url: SITE.url,
        email: SITE.email,
        telephone: SITE.phone.e164,
        sameAs: SOCIALS.map((social) => social.href),
      },
      {
        "@type": "ProfessionalService",
        "@id": `${SITE.url}/#service`,
        name: SITE.name,
        url: SITE.url,
        email: SITE.email,
        telephone: SITE.phone.e164,
        founder: { "@id": PERSON_ID },
      },
    ],
  };
}

/** JSON for an inline <script type="application/ld+json">, with `<` escaped so no value can close the element. */
export function jsonLdScript(jsonLd: object): string {
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}
