import { Suspense } from "react";
import { ResetPasswordExperience } from "../../components/PasswordRecoveryExperience";

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordExperience />
        </Suspense>
    );
}
