import "./globals.css";
import "react-image-crop/dist/ReactCrop.css";
import { SiteChrome } from "../components/SiteChrome";
import { PwaRegistration } from "../components/PwaRegistration";
import { BRAND } from "../config/branding";

export default function RootLayout({ children }) {

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="text-gray-900" suppressHydrationWarning>
        <PwaRegistration />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
export const metadata = {
  title: BRAND.name,
  description: "Upload products, manage catalog content, and schedule social posts from your phone.",
  applicationName: BRAND.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/orva-logo-mark-alpha.svg", type: "image/svg+xml" },
      { url: "/icons/orva-alpha-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/orva-alpha-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/orva-alpha-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1b4fd8",
};
