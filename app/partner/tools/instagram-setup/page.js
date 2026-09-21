import { Suspense } from "react";
import { MetaSetupAssistant } from "../../../../components/partner/MetaSetupAssistant";

export default function InstagramSetupToolPage() {
    return (
        <Suspense fallback={null}>
            <MetaSetupAssistant />
        </Suspense>
    );
}
