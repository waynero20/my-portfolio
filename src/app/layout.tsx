import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/smooth-scroll";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Wayne — Full-Stack Developer",
  description:
    "Full-stack developer building products people actually use. Specializing in Next.js, React, TypeScript, and modern web technologies.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Wayne — Full-Stack Developer",
    description:
      "Full-stack developer building products people actually use. Specializing in Next.js, React, TypeScript, and modern web technologies.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-poppins antialiased">
        <div className="gradient-mesh" />
        <div className="gradient-blob-3" />
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
