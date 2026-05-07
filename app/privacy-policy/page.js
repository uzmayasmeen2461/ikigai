import { LegalPage } from "../../components/LegalPage";

export default function PrivacyPolicyPage() {
    return (
        <LegalPage
            eyebrow="ikigaidigital Policy"
            title="Privacy Policy"
            updated="18 April 2026"
            intro="ikigaidigital respects the privacy of business owners, clients, and partners who use our digital setup and task execution services."
            sections={[
                {
                    title: "Information we collect",
                    body: "We may collect your name, email, phone number, business details, task requirements, documents or assets shared for service execution, payment metadata, and dashboard activity needed to provide ikigaidigital services.",
                },
                {
                    title: "How we use information",
                    body: "We use this information to create tasks, process payments, generate invoices, coordinate service execution, provide support, improve the product experience, and maintain operational records.",
                },
                {
                    title: "Payments and invoices",
                    body: "Payments are processed through secure payment partners such as Razorpay. ikigaidigital stores relevant order, payment, invoice, and task metadata for confirmation, reconciliation, and support.",
                },
                {
                    title: "Data sharing",
                    body: "We share only the information needed to complete a task with authorized ikigaidigital partners or service providers. We do not sell client data.",
                },
                {
                    title: "Security",
                    body: "We use access controls and managed workflows to protect business details. Clients should avoid sharing unnecessary passwords or sensitive information unless requested through approved ikigaidigital flows.",
                },
            ]}
        />
    );
}
