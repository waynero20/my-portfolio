export type Project = {
  title: string;
  tagline: string;
  description: string;
  highlights: string[];
  stack: string[];
  gradient: string;
  accentColor: string;
  category: string;
};

export const categories = ["E-COMMERCE", "SEO", "MARKETPLACE", "ERP"] as const;

export const projects: Project[] = [
  {
    title: "Bloom & Blossom",
    tagline: "Flower Delivery E-Commerce",
    description:
      "A flower delivery e-commerce platform for the Philippine market. Features a curated bouquet catalog with dynamic pricing in PHP, promo campaigns, order tracking, and a robust admin panel for catalog and inventory management.",
    highlights: [
      "Curated bouquet catalog with categories",
      "Promo banners & popup campaigns",
      "Order tracking by reference number",
      "Role-based admin dashboard",
      "Cloudinary-powered image management",
    ],
    stack: ["Next.js", "TypeScript", "Supabase", "Cloudinary", "Tailwind CSS"],
    gradient: "from-pink-500 to-rose-600",
    accentColor: "#ec4899",
    category: "E-COMMERCE",
  },
  {
    title: "Legacy Smiles",
    tagline: "Dental Clinic Corporate Site",
    description:
      "A polished corporate website for a dental clinic in Mandaue, Cebu. Features GSAP-powered animations, a Contentful-driven blog, services directory, team showcase, HMO partner listings, Google reviews integration, and SEO-optimized pages with structured data for local search.",
    highlights: [
      "GSAP & Framer Motion animations",
      "Contentful CMS with blog & rich text",
      "Google Reviews integration",
      "HMO partner directory",
      "LocalBusiness structured data & SEO",
    ],
    stack: ["Next.js", "TypeScript", "Contentful", "GSAP", "AWS CloudFront", "Tailwind CSS"],
    gradient: "from-blue-500 to-indigo-600",
    accentColor: "#3b82f6",
    category: "SEO",
  },
  {
    title: "Tampus Dental",
    tagline: "Dental Clinic Corporate Site",
    description:
      "A polished corporate website for a dental clinic in Cebu City. CMS-powered content with a blog, services directory, team showcase, and SEO-optimized pages. Features smooth animations and structured data for local search.",
    highlights: [
      "Contentful CMS integration",
      "Blog with rich text rendering",
      "Services directory with filtering",
      "SEO with LocalBusiness structured data",
      "Smooth scroll animations",
    ],
    stack: ["Next.js", "TypeScript", "Contentful", "Framer Motion", "Tailwind CSS"],
    gradient: "from-amber-500 to-orange-600",
    accentColor: "#f59e0b",
    category: "SEO",
  },
  {
    title: "TutorLoop",
    tagline: "Online Tutoring Marketplace",
    description:
      "A full-featured K-12 and AP tutoring marketplace connecting students with verified tutors. Includes real-time video sessions, booking management, tutor verification with AI-powered document processing, and a comprehensive admin dashboard.",
    highlights: [
      "Live video tutoring sessions",
      "AI-powered tutor verification (AWS Rekognition & Textract)",
      "Booking system with calendar integration",
      "Review & rating system",
      "Admin dashboard with session management",
    ],
    stack: ["Next.js", "TypeScript", "Supabase", "AWS", "React Query", "Tailwind CSS"],
    gradient: "from-violet-500 to-purple-600",
    accentColor: "#8b5cf6",
    category: "MARKETPLACE",
  },
  {
    title: "Horizon ERP",
    tagline: "Enterprise Resource Planning",
    description:
      "A full-suite ERP system for travel and supply chain operations. Manages sales agreements, purchase orders, travel & accommodation vouchers, tour packages, and financial transactions with role-based approval workflows and real-time dashboards.",
    highlights: [
      "Sales & purchase order workflows",
      "Travel & accommodation voucher management",
      "Tour package builder with itineraries",
      "Role-based approval system",
      "Real-time financial dashboard",
    ],
    stack: ["Next.js", "TypeScript", "Express", "PostgreSQL", "Prisma", "Socket.io"],
    gradient: "from-green-600 to-orange-500",
    accentColor: "#045c2b",
    category: "ERP",
  },
];

export const techStack = {
  Frontend: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion", "GSAP"],
  "Backend & Data": ["Supabase", "PostgreSQL", "REST APIs", "React Query"],
  Cloud: ["AWS S3", "AWS Rekognition", "AWS Textract", "AWS CloudFront", "Cloudinary", "Upstash Redis"],
  "Tools & CMS": ["Contentful", "Git", "Vercel"],
};

export const socials = {
  github: "https://github.com/waynero20",
  linkedin: "https://www.linkedin.com/in/waynerondina/",
  facebook: "https://www.facebook.com/waynerondina20/",
  instagram: "https://www.instagram.com/waynerondina/",
  gravatar: "https://gravatar.com/waynerondina20",
  email: "mailto:waynerondina20@gmail.com",
  phone: "tel:+639498718967",
};
