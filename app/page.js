import { ComingSoonPage } from "../components/ComingSoonPage";
import { SimpleHomeLanding } from "../components/SimpleHomeLanding";

export default function Home() {
  const forceComingSoon = process.env.NEXT_PUBLIC_SHOW_COMING_SOON === "true";

  if (forceComingSoon) {
    return <ComingSoonPage />;
  }

  return <SimpleHomeLanding />;
}
