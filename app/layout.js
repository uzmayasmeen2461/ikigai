import "./globals.css";
import "react-image-crop/dist/ReactCrop.css";
import { SiteChrome } from "../components/SiteChrome";
import { BRAND } from "../config/branding";

export default function RootLayout({ children }) {

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="text-gray-900" suppressHydrationWarning>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
export const metadata = {
  title: BRAND.name,
  description: "ORVA helps small businesses grow digitally using WhatsApp, catalog setup, and online presence.",
};
