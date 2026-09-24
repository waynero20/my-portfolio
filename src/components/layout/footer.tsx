import { SocialCta } from "@/components/ui/social-cta";
import { CONTACT_SOCIALS } from "@/components/sections/contact/contact-socials";

import { BUILD_INFO } from "@/lib/build-info";
import { CREDITS, SITE } from "@/lib/data";

/**
 * The closing frame: "Let’s make the next one.", then the © line and the socials as x-ray tiles.
 * No end-credits roll and no Rewind (Wayne's W13). Server-rendered, no islands.
 */
export function Footer() {
  return (
    <footer id="outro" data-lighting-cue="footer" className="relative isolate px-4 pt-20 pb-8 md:px-8 lg:pt-28">
      <div className="mx-auto flex max-w-7xl flex-col items-center text-center">
        <p className="credits-final text-bone">{CREDITS.finalFrame}</p>
      </div>

      <div className="mx-auto mt-16 flex max-w-7xl flex-col-reverse items-center gap-6 border-t border-hairline pt-6 md:flex-row md:justify-between lg:mt-24">
        <p className="font-mono text-mono text-ash">
          © {BUILD_INFO.year} {SITE.name} · {SITE.location.city}
        </p>
        <ul aria-label="Profiles" className="flex items-center gap-3">
          {CONTACT_SOCIALS.map((social) => (
            <li key={social.id} className="flex">
              <SocialCta social={social} variant="tile" />
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
