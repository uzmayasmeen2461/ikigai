import { LegalPage } from "../../components/LegalPage";

export default function DataDeletionPage() {
    return (
        <LegalPage
            eyebrow="ORVA Policy"
            title="Data Deletion Instructions"
            updated="1 August 2026"
            intro="ORVA users can request deletion of account, business, inventory, uploaded media, and connected social account data handled by ORVA."
            sections={[
                {
                    title: "How to request deletion",
                    body: "Email ORVA support from your registered email address with the subject Data Deletion Request. Include your business name and the ORVA login email so we can verify the account before processing the request.",
                },
                {
                    title: "What can be deleted",
                    body: "You can request deletion of your ORVA profile, business details, uploaded product images, inventory records, generated captions, saved drafts, connected Facebook or Instagram connection records, and related operational data that is no longer required for service delivery.",
                },
                {
                    title: "What may be retained",
                    body: "Some payment, invoice, security, legal, fraud-prevention, or compliance records may be retained where required by law or legitimate business obligations. These records are limited and protected.",
                },
                {
                    title: "Processing time",
                    body: "After verification, ORVA will process eligible deletion requests within a reasonable period and confirm completion or explain any records that must be retained.",
                },
                {
                    title: "Facebook and Instagram data",
                    body: "If you connected Facebook or Instagram to ORVA, you may also remove ORVA access from your Facebook account settings. ORVA will delete stored connection records and tokens when your deletion request is processed.",
                },
            ]}
        />
    );
}
