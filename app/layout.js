import "./globals.css";
import { Footer } from "../components/Footer";
import { WhatsAppButton } from "../components/WhatsAppButton";

export default function RootLayout({ children }) {

  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <div className="max-w-[1440px] mx-auto px-6 min-h-screen flex flex-col">
          <div className="flex-grow">{children}</div>

          <WhatsAppButton />

          <Footer />
        </div>
      </body>
    </html>
  );
}
export const metadata = {
  title: "IKIGAI",
  description: "Connecting Purpose with Productivity",
};