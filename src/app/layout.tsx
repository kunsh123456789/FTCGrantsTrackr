import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { getTeamSettings } from "@/lib/data";
import { readableTextOn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getTeamSettings();
  return {
    title: { default: `${settings.team_name} · Grants`, template: `%s · ${settings.team_name}` },
    description: "Track grants and sponsorships for our FIRST Tech Challenge team.",
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f17" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getTeamSettings();
  const brandStyle = {
    "--brand": settings.primary_color,
    "--brand-foreground": readableTextOn(settings.primary_color),
    "--brand-accent": settings.accent_color,
    "--brand-accent-foreground": readableTextOn(settings.accent_color),
  } as React.CSSProperties;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={brandStyle}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
