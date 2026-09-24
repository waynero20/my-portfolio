// ALL site content. This is the one file to edit for copy, links and brand colours.
//
// Rules:
// - Only `import type` here: Node scripts import this file (content.test.ts enforces it).
// - A gap is `null` or `confirmed: false`, never "". Each one is marked TODO(wayne), and
//   listContentGaps() in content.ts lists them all.
// - Brand colours are hex. theme.ts turns them into oklch CSS; theme.test.ts checks their contrast.

import type {
  Edition,
  ProcessStage,
  Project,
  Service,
  Tool,
  ToolId,
  TypecastPreset,
} from "@/lib/types";

interface Cta {
  label: string;
  href: string;
}

export const SITE = {
  name: "Wayne Rondina",
  role: "Full-stack engineer",
  url: "https://waynerondina.dev",
  timeZone: "Asia/Manila",
  location: { city: "Cebu City", country: "PH" },
  phone: { display: "0949 871 8967", e164: "+639498718967", digits: "09498718967" },
  email: "waynerondina20@gmail.com",
  // TODO(wayne): add public/resume/wayne-rondina.pdf and set this to "/resume/wayne-rondina.pdf".
  resume: null as string | null,
  status: "Open to freelance projects & full-time roles",
} as const;

export const EDITIONS = {
  client: {
    lead: "I design and build websites, online stores, marketplaces and ERPs, from first sketch to production database.",
    primaryCta: { label: "See the work", href: "#work" },
    secondaryCta: { label: "Dial me in", href: "#contact" },
    confirmed: true,
  },
  team: {
    // TODO(wayne): draft engineering lead for ?for=team. Rewrite it in your own words, then set
    // confirmed: true.
    lead: "I'm a full-stack TypeScript engineer: Next.js and React up front, Postgres, Supabase and AWS behind — I take features from schema to shipped UI.",
    primaryCta: { label: "See the work", href: "#work" },
    secondaryCta: { label: "Dial me in", href: "#contact" },
    confirmed: false,
  },
} as const satisfies Record<Edition, { lead: string; primaryCta: Cta; secondaryCta: Cta; confirmed: boolean }>;

export const NAV_LINKS = [
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Stack", href: "#stack" },
  { label: "Contact", href: "#contact" },
] as const satisfies readonly Cta[];

/** The chapters, in page order. Each id is a section id on the page. */
export const SECTIONS = [
  { id: "hero", label: "Cold open" },
  { id: "work", label: "Selected work" },
  { id: "services", label: "Services" },
  { id: "stack", label: "Stack" },
  { id: "contact", label: "Contact" },
  { id: "outro", label: "Outro" },
] as const;

/** The title's night face (its axes) until the reel floods and it is re-cast in the brand's titleFont. */
export const NIGHT_TYPECAST: TypecastPreset = { wght: 640, wdth: 100, rond: 0 };

// Logo and overlay files keep their current names in M1 (Ruling R8). Logo sizes are the real
// pixel sizes, read with sharp.
export const PROJECTS: readonly Project[] = [
  {
    slug: "bloom",
    abbr: "BB",
    title: "Bloom & Blossom",
    category: "E-commerce",
    market: "PH",
    tagline: "An online flower shop for the Philippines",
    story:
      "Bloom & Blossom sells curated bouquets online, priced in pesos, with promos and order tracking built in. Behind the shop, a role-based admin keeps the catalog, stock and product photos up to date.",
    highlights: [
      "Curated bouquet catalog, priced in pesos",
      "Promo banners, pop-up campaigns and order tracking",
      "Role-based admin for the catalog, stock and photos",
    ],
    outcome: null, // TODO(wayne): one-line outcome (sales, orders, time saved…)
    stack: ["nextjs", "typescript", "supabase", "cloudinary", "tailwind"],
    stackConfirmed: false, // TODO(wayne): confirm the stack
    industry: "retail",
    live: { kind: "public", href: "https://bloomandblossom-two.vercel.app/" },
    theme: {
      scheme: "light",
      surface: "#FAF7F2",
      ink: "#2F5D50",
      muted: "#56675F",
      accent: "#E8A7A7",
      accentUse: "decorative",
      ctaBg: "#2F5D50",
      ctaInk: "#FAF7F2",
      focus: "#2F5D50",
      nightDot: "#E8A7A7",
      spill: ["#E8A7A7", "#2F5D50"],
      spillMode: "ambilight",
    },
    titleFont: {
      family: "Playfair Display",
      weight: 600,
      style: "normal",
      source: "bloomandblossom src/app/layout.tsx, globals.css (font-display font-semibold)",
    },
    logo: { src: "/logos/bloomandblossom.webp", width: 2000, height: 2000, alt: "Bloom & Blossom logo", zoom: 1.25 },
    overlay: { src: "/overlays/bloomandblossom.webp", blend: "multiply", opacity: 0.18 },
  },
  {
    slug: "legacy",
    abbr: "LS",
    title: "Legacy Smiles",
    category: "Corporate site",
    market: "PH",
    tagline: "A dental clinic website that brings in local patients",
    story:
      "Legacy Smiles is a dental clinic in Mandaue, Cebu that wanted to be found by patients nearby. The site pairs polished animation with a blog the clinic edits itself, Google reviews and its HMO partners.",
    highlights: [
      "Pages and blog the clinic edits in Contentful",
      "Google reviews and an HMO partner directory",
      "Local SEO with LocalBusiness structured data",
    ],
    outcome: null, // TODO(wayne): one-line outcome
    // TODO(wayne): confirm the stack. Framer Motion was added because the old highlights mention it.
    stack: ["nextjs", "typescript", "contentful", "gsap", "framer-motion", "cloudfront", "tailwind"],
    stackConfirmed: false,
    industry: "healthcare",
    live: { kind: "public", href: "https://legacysmiles.ph/" },
    theme: {
      scheme: "light",
      surface: "#FFFFFF",
      ink: "#120A3D",
      muted: "#625E78",
      accent: "#3D00FF",
      accentUse: "text",
      ctaBg: "#3D00FF",
      ctaInk: "#FFFFFF",
      focus: "#3D00FF",
      nightDot: "#6294E9",
      spill: ["#3D00FF", "#6294E9"],
      spillMode: "split",
    },
    titleFont: {
      family: "Cinzel",
      weight: 600,
      style: "normal",
      trackingEm: -0.025,
      source: "legacy-smiles-web app/fonts.ts, app/globals.css (.font-display, headings 600)",
    },
    logo: { src: "/logos/legacysmiles.webp", width: 512, height: 512, alt: "Legacy Smiles logo" },
    overlay: { src: "/overlays/legacysmilesnew.webp", blend: "multiply", opacity: 0.18 },
  },
  {
    slug: "tampus",
    abbr: "TD",
    title: "Tampus Dental",
    category: "Corporate site",
    market: "PH",
    tagline: "A calm, premium website for a Cebu City dental clinic",
    story:
      "Tampus Dental is a dental clinic in Cebu City, and its website carries the same calm, premium feel. The team updates services, staff and blog posts in a CMS, and every page is built to rank in local search.",
    highlights: [
      "Services, team and blog managed in Contentful",
      "A services directory patients can filter",
      "Local SEO with LocalBusiness structured data",
    ],
    outcome: null, // TODO(wayne): one-line outcome
    stack: ["nextjs", "typescript", "contentful", "framer-motion", "tailwind"],
    stackConfirmed: false, // TODO(wayne): confirm the stack
    industry: "healthcare",
    live: { kind: "public", href: "https://www.tampusdental.com/" },
    theme: {
      scheme: "dark",
      surface: "#002333",
      ink: "#F3EBDD",
      muted: "#B5AE9F",
      accent: "#E6BB4A",
      accentUse: "text",
      ctaBg: "#E6BB4A",
      ctaInk: "#002333",
      focus: "#E6BB4A",
      nightDot: "#E6BB4A",
      spill: ["#C49528", "#E6BB4A"],
      spillMode: "ambilight",
      titleGradient: ["#C49528", "#E6BB4A"],
    },
    titleFont: {
      family: "Raleway",
      weight: 700,
      style: "normal",
      source: "tadoc-web app/layout.tsx, components/ui/SectionHeading.tsx (weight 700)",
    },
    logo: { src: "/logos/tadocweb.webp", width: 2000, height: 2000, alt: "Tampus Dental logo" },
    overlay: { src: "/overlays/tampusdental.webp", blend: "screen", opacity: 0.25 },
  },
  {
    slug: "tutorloop",
    abbr: "TL",
    // TODO(wayne): the live site is tutorformystudent.com. Keep the name "TutorLoop"?
    title: "TutorLoop",
    category: "Marketplace",
    market: null, // TODO(wayne): which market? (K-12 and AP suggests US students.)
    tagline: "A tutoring marketplace with verified tutors",
    story:
      "TutorLoop connects K-12 and AP students with tutors who have been checked and verified. Students book sessions, meet over live video and leave reviews, while AI-assisted document checks speed up tutor sign-up.",
    highlights: [
      "Live video tutoring sessions",
      "Tutor verification with AWS Rekognition and Textract",
      "Bookings with calendar integration, reviews and ratings",
    ],
    outcome: null, // TODO(wayne): one-line outcome
    // TODO(wayne): confirm the stack. The old "AWS" entry is split into Rekognition and Textract.
    stack: ["nextjs", "typescript", "supabase", "rekognition", "textract", "react-query", "tailwind"],
    stackConfirmed: false,
    industry: "education",
    live: { kind: "public", href: "https://www.tutorformystudent.com/" },
    theme: {
      scheme: "light",
      surface: "#F8F7FF",
      ink: "#312E81",
      muted: "#625F8F",
      accent: "#F59E0B",
      accentUse: "decorative",
      ctaBg: "#F59E0B",
      ctaInk: "#312E81",
      focus: "#312E81",
      nightDot: "#F59E0B",
      spill: ["#F59E0B", "#312E81"],
      spillMode: "ambilight",
    },
    titleFont: {
      family: "Bricolage Grotesque",
      weight: 700,
      style: "normal",
      trackingEm: -0.025,
      source: "tutorloop src/app/layout.tsx, globals.css (font-heading font-bold tracking-tight)",
    },
    // The mark fills only 71% × 25% of this file, so it is zoomed inside its plate.
    logo: { src: "/logos/tutorloop.webp", width: 1536, height: 1024, alt: "TutorLoop logo", zoom: 2.4 },
    overlay: { src: "/overlays/tutorloop.webp", blend: "multiply", opacity: 0.18 },
  },
  {
    slug: "horizon",
    abbr: "HZ",
    title: "Horizon ERP",
    category: "ERP",
    market: null, // TODO(wayne): which market? Shown on the reel slate when set (e.g. "PH").
    tagline: "One system to run a travel and supply business",
    story:
      "Horizon runs the day-to-day of a travel and supply business: sales agreements, purchase orders, vouchers and tour packages in one place. Role-based approvals keep work moving, and live dashboards show where the money stands.",
    highlights: [
      "Sales and purchase order workflows with role-based approvals",
      "Travel vouchers and tour packages with itineraries",
      "A real-time financial dashboard",
    ],
    outcome: null, // TODO(wayne): one-line outcome
    stack: ["nextjs", "typescript", "express", "postgresql", "prisma", "socket-io"],
    stackConfirmed: false, // TODO(wayne): confirm the stack
    industry: "travel-logistics",
    live: { kind: "private", label: "Private system — request a walkthrough", mailSubject: "Horizon ERP walkthrough" },
    theme: {
      scheme: "light",
      surface: "#FFFFFF",
      ink: "#045C2B",
      muted: "#53695B",
      accent: "#F15C01",
      accentUse: "large",
      ctaBg: "#045C2B",
      ctaInk: "#FFFFFF",
      focus: "#045C2B",
      nightDot: "#F15C01",
      spill: ["#045C2B", "#F15C01"],
      spillMode: "split",
    },
    titleFont: {
      family: "Poppins",
      weight: 700,
      style: "normal",
      source: "horizon-erp app/layout.tsx (font-bold headings)",
    },
    logo: { src: "/logos/horizonerp.webp", width: 1625, height: 924, alt: "Horizon ERP logo" },
    overlay: { src: "/overlays/horizonerp.webp", blend: "multiply", opacity: 0.18 },
  },
  {
    slug: "matchme",
    abbr: "MM",
    title: "Match Me",
    category: "E-commerce",
    market: "PH",
    tagline: "An online shop and back office for a matcha studio",
    story:
      "A Cebu City matcha studio was taking orders by hand across Instagram, Messenger and walk-ins. Match Me gives it a branded shop with a four-step mobile checkout, and an owner dashboard that runs orders, deliveries, stock and revenue from one phone.",
    highlights: [
      "Four-step mobile checkout with GCash and bank payment-proof upload",
      "Stock that can't oversell: every order reserves its jars in one Postgres transaction",
      "Owner dashboard for orders, a delivery calendar, inventory and revenue",
    ],
    outcome: null, // TODO(wayne): one-line outcome
    stack: ["nextjs", "typescript", "supabase", "postgresql", "tailwind", "daisyui", "zod", "framer-motion"],
    stackConfirmed: true,
    industry: "retail",
    live: { kind: "public", href: "https://match-me-delta.vercel.app" },
    theme: {
      scheme: "light",
      surface: "#FBFCF7",
      ink: "#122412",
      muted: "#5A6B52",
      accent: "#E35D8A",
      accentUse: "decorative",
      ctaBg: "#C4E56F",
      ctaInk: "#122412",
      focus: "#6F912C",
      nightDot: "#C4E56F",
      spill: ["#C4E56F", "#E35D8A"],
      spillMode: "ambilight",
    },
    titleFont: {
      family: "Fredoka",
      weight: 600,
      style: "normal",
      trackingEm: -0.03,
      source: "match-me app/fonts.ts, app/globals.css (--text-hero)",
    },
    logo: { src: "/logos/matchme.webp", width: 228, height: 128, alt: "Match Me logo" },
    overlay: { src: "/overlays/matchme.webp", blend: "multiply", opacity: 0.18 },
  },
  {
    slug: "pickanddink",
    abbr: "PD",
    title: "Pick & Dink",
    category: "Booking platform",
    market: null, // TODO(wayne): where is the venue?
    tagline: "Court booking and venue operations for a pickleball club",
    story:
      "Players used to book courts through chat threads while staff tracked slots and payments by hand. Pick & Dink lets a player book and pay for a court in under two minutes with no account, while staff confirm GCash payments and run the day from one admin.",
    highlights: [
      "Guest booking with no accounts: sport, court, time, details, pay",
      "Double booking made impossible by constraints in the database itself",
      "Staff admin for payments, schedules, open play and courts",
    ],
    outcome: null, // TODO(wayne): one-line outcome
    stack: ["nextjs", "typescript", "supabase", "postgresql", "tailwind", "daisyui", "zod", "react-query", "framer-motion"],
    stackConfirmed: true,
    industry: "sports-recreation",
    live: { kind: "public", href: "https://pickanddink.vercel.app" },
    theme: {
      scheme: "light",
      surface: "#F4F5F7",
      ink: "#001236",
      muted: "#555A60",
      accent: "#003EC5",
      accentUse: "text",
      ctaBg: "#003EC5",
      ctaInk: "#FFFFFF",
      focus: "#1A5CE8",
      nightDot: "#7FA9FF",
      spill: ["#003EC5", "#7FA9FF"],
      spillMode: "ambilight",
    },
    titleFont: {
      family: "Barlow Condensed",
      weight: 700,
      style: "italic",
      textCase: "upper",
      trackingEm: 0.01,
      source: "pick-and-dink src/app/layout.tsx, globals.css (display-type)",
    },
    logo: { src: "/logos/pickanddink.webp", width: 138, height: 128, alt: "Pick & Dink logo" },
    overlay: { src: "/overlays/pickanddink.webp", blend: "multiply", opacity: 0.18 },
  },
];

// TODO(wayne): draft deliverables. Edit them to match what you actually offer. `reels` are the
// projects an opened row shows as logo links; together they cover all seven reels.
export const SERVICES: readonly Service[] = [
  {
    id: "sites",
    title: "Marketing & corporate sites",
    deliverables: [
      "A fast, mobile-first website designed around your brand",
      "Pages and a blog your team edits without a developer",
      "Local SEO, structured data and Google-ready pages",
      "Hosting, analytics and a launch you don't have to babysit",
    ],
    reels: ["legacy", "tampus"],
  },
  {
    id: "commerce",
    title: "E-commerce",
    deliverables: [
      "A catalog, cart and checkout built for phones",
      "Local payments such as GCash, with payment-proof upload",
      "Promos, stock and order tracking in one admin",
      "Product photos that load fast on any connection",
    ],
    reels: ["bloom", "matchme"],
  },
  {
    id: "platforms",
    title: "SaaS, marketplaces & booking",
    deliverables: [
      "Sign-up, accounts, roles and permissions",
      "Bookings and schedules that can't double-book",
      "Live features such as video sessions and notifications",
      "Admin dashboards to run the platform day to day",
    ],
    reels: ["tutorloop", "pickanddink"],
  },
  {
    id: "systems",
    title: "ERP & internal systems",
    deliverables: [
      "Workflows and approvals that match how your team works",
      "Sales, purchasing and financial records in one place",
      "Role-based access for every department",
      "Live dashboards and reports",
    ],
    reels: ["horizon"],
  },
];

// TODO(wayne): draft process copy. Set confirmed: true once each stage reads the way you work.
export const PROCESS: readonly ProcessStage[] = [
  {
    tag: "PRE",
    title: "Discovery & fixed quote",
    body: "We talk through your goals, your customers and your budget. You get a clear scope, a timeline and a fixed quote before any work starts.",
    confirmed: false,
  },
  {
    tag: "PROD",
    title: "Build with weekly preview links",
    body: "I build in small steps and send you a live preview link every week, so you can click through the progress and steer early.",
    confirmed: false,
  },
  {
    tag: "POST",
    title: "Polish & launch",
    body: "Testing on real phones, speed tuning, SEO and loading your content, then a launch you don't have to babysit.",
    confirmed: false,
  },
  {
    tag: "PREMIERE",
    title: "Care",
    body: "After launch I stay on for fixes, updates and new features, so the site keeps up as your business grows.",
    confirmed: false,
  },
];

// TODO(wayne): draft "why" lines (the call sheet shows one per tool, in a single line). A null line
// is hidden; fill in the ones you can speak to.
export const TOOLS: readonly Tool[] = [
  { id: "nextjs", name: "Next.js", abbr: "NX", layer: "framework", why: "Fast pages Google can read, from one codebase." },
  { id: "typescript", name: "TypeScript", abbr: "TS", layer: "framework", why: "Catches mistakes before your customers do." },
  { id: "express", name: "Express", abbr: "EX", layer: "framework", why: "A small, dependable API server behind the ERP." },
  { id: "tailwind", name: "Tailwind CSS", abbr: "TW", layer: "interface", why: "A consistent look that's quick to change." },
  { id: "gsap", name: "GSAP", abbr: "GS", layer: "interface", why: "Precise, smooth animation that stays fast on phones." },
  { id: "daisyui", name: "daisyUI", abbr: "DU", layer: "interface", why: "Themeable components, so a brand's look lands fast and stays consistent." },
  { id: "zod", name: "Zod", abbr: "ZD", layer: "data", why: "Every form and order is checked before it reaches the database." },
  { id: "framer-motion", name: "Framer Motion", abbr: "FM", layer: "interface", why: "Friendly interface animation with very little code." },
  { id: "supabase", name: "Supabase", abbr: "SB", layer: "data", why: "Auth, Postgres and storage in days, not weeks." },
  { id: "postgresql", name: "PostgreSQL", abbr: "PG", layer: "data", why: "Orders, bookings and money in a database that enforces its own rules." },
  { id: "prisma", name: "Prisma", abbr: "PR", layer: "data", why: "Typed, safe database queries and migrations." },
  { id: "react-query", name: "React Query", abbr: "RQ", layer: "data", why: "Screens stay in sync with the server, with caching built in." },
  { id: "socket-io", name: "Socket.IO", abbr: "IO", layer: "data", why: "Live updates: dashboards refresh the moment the data changes." },
  { id: "contentful", name: "Contentful", abbr: "CF", layer: "content", why: "Your team edits pages and posts without calling a developer." },
  { id: "cloudinary", name: "Cloudinary", abbr: "CL", layer: "content", why: "Product photos resized and optimised automatically." },
  { id: "cloudfront", name: "AWS CloudFront", abbr: "CDN", layer: "cloud", why: "Serves files fast from servers close to your visitors." },
  { id: "rekognition", name: "AWS Rekognition", abbr: "RK", layer: "cloud", why: "Helps verify each tutor's identity from their photos." },
  { id: "textract", name: "AWS Textract", abbr: "TX", layer: "cloud", why: "Reads uploaded documents, so tutors get verified faster." },
  { id: "git", name: "Git", abbr: "GIT", layer: "framework", why: "Every change tracked and easy to roll back." },
  { id: "vercel", name: "Vercel", abbr: "VC", layer: "cloud", why: "A preview link for every change, and one-click launches." },
  { id: "rest-apis", name: "REST APIs", abbr: "API", layer: "data", why: null },
  { id: "upstash-redis", name: "Upstash Redis", abbr: "RD", layer: "data", why: null },
  { id: "s3", name: "AWS S3", abbr: "S3", layer: "cloud", why: "Durable storage for uploads and documents." },
];

/** Tools used everywhere, shown as one row with no per-project claims. Disjoint from every project stack. */
export const EVERYDAY_KIT = ["git", "vercel", "rest-apis", "upstash-redis", "s3"] as const satisfies readonly ToolId[];

export const SOCIALS = [
  { id: "github", label: "GitHub", handle: "@waynero20", href: "https://github.com/waynero20" },
  { id: "linkedin", label: "LinkedIn", handle: "in/waynerondina", href: "https://www.linkedin.com/in/waynerondina/" },
  { id: "facebook", label: "Facebook", handle: "waynerondina20", href: "https://www.facebook.com/waynerondina20" },
  { id: "instagram", label: "Instagram", handle: "@waynerondina", href: "https://www.instagram.com/waynerondina/" },
  { id: "gravatar", label: "Gravatar", handle: "waynerondina20", href: "https://gravatar.com/waynerondina20" },
] as const;

export const CONTACT_COPY = {
  kicker: "Contact",
  callerPlace: SITE.location.city,
  zoneLabel: "PHT",
} as const;

export const CREDITS = {
  /** The closing frame over the footer. The end-credits roll and Rewind were removed (Wayne's W13). */
  finalFrame: "Let’s make the next one.",
} as const;
