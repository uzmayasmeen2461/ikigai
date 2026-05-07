import { Suspense } from "react";
import { InstagramSetupAssistant } from "../../../../components/partner/InstagramSetupAssistant";

export default function InstagramSetupToolPage() {
    return (
        <Suspense fallback={null}>
            <InstagramSetupAssistant />
        </Suspense>
    );
}
