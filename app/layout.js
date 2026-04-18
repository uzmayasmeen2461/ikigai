import "./globals.css";
import { SiteChrome } from "../components/SiteChrome";

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
  title: "IKIGAI",
  description: "Connecting Purpose with Productivity",
};
