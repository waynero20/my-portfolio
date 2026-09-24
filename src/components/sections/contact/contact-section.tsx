import { CebuClock } from "@/components/ui/cebu-clock";

import { CONTACT_COPY, SITE } from "@/lib/data";

const EMAIL_ID = "contact-email";
const PHONE_ID = "contact-phone";

/** "waynerondina20" and "@gmail.com": phones set them on two lines so the address can be larger. */
const [EMAIL_USER, EMAIL_DOMAIN] = [SITE.email.slice(0, SITE.email.indexOf("@")), SITE.email.slice(SITE.email.indexOf("@"))];

/** "0949", "871", "8967": phones stack them. */
const PHONE_GROUPS = SITE.phone.display.split(" ");

/**
 * Contact: the email and the phone number, and nothing else to learn (Wayne's W14/W15: no dial pad,
 * no socials here). One centred screen: the eyebrow, then the two lines at the largest size their
 * column allows, drifting in opposite directions as the section scrolls through (a CSS view timeline,
 * contact.css; still under reduced motion), then the availability line. Both lines
 * are plain mailto: / tel: links, server-rendered, so everything works with no JavaScript. The hero's
 * "Dial me in" lands here.
 */
export function ContactSection() {
  return (
    <section
      id="contact"
      data-section=""
      data-lighting-cue="contact"
      aria-labelledby="contact-title"
      className="contact-section relative isolate px-4 md:px-8"
    >
      <div className="contact-screen @container mx-auto flex min-h-svh max-w-7xl flex-col">
        <div
          aria-hidden
          className="flex items-center justify-center gap-3 font-mono text-mono tracking-[0.06em] text-ash uppercase sm:gap-4 sm:tracking-[0.14em]"
        >
          <span className="text-bone">{CONTACT_COPY.kicker}</span>
          <span className="h-px w-5 bg-hairline sm:w-8" />
          <span className="flex items-center whitespace-nowrap">
            {CONTACT_COPY.callerPlace} ·
            <CebuClock className="ml-[1ch] tracking-normal normal-case" />
          </span>
        </div>
        <h2 id="contact-title" className="sr-only">
          {CONTACT_COPY.kicker}
        </h2>

        <div data-atmo-text="" className="contact-lines my-auto flex flex-col items-center">
          <a id={EMAIL_ID} href={`mailto:${SITE.email}`} data-drift="left" className="contact-line contact-email">
            <span className="contact-email-user">{EMAIL_USER}</span>
            <span className="contact-email-domain">{EMAIL_DOMAIN}</span>
          </a>
          <a
            id={PHONE_ID}
            href={`tel:${SITE.phone.e164}`}
            aria-label={`Call ${SITE.phone.display}`}
            data-drift="right"
            className="contact-line contact-phone"
          >
            {PHONE_GROUPS.map((group) => (
              <span key={group} className="contact-phone-group">
                {group}
              </span>
            ))}
          </a>

          <p className="contact-status flex flex-col items-center gap-4 text-center font-mono text-mono leading-5 text-ash">
            <span aria-hidden className="h-6 w-px bg-hairline" />
            <span className="text-balance">{SITE.status}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
