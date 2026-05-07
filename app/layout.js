import "./globals.css";
import "react-image-crop/dist/ReactCrop.css";
import { SiteChrome } from "../components/SiteChrome";
import { BRAND } from "../config/branding";

export default function RootLayout({ children }) {

  return (
    <html lang="en">
      <body className="text-gray-900">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
export const metadata = {
  title: BRAND.name,
  description: "ikigaidigital helps small businesses grow digitally using WhatsApp, catalog setup, and online presence.",
};
