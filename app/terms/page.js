import { LegalPage } from "../../components/LegalPage";

export default function TermsPage() {
    return (
        <LegalPage
            eyebrow="IKIGAI Policy"
            title="Terms & Conditions"
            updated="18 April 2026"
            intro="These terms describe how clients and partners use IKIGAI for managed digital setup, service execution, payments, and dashboards."
            sections={[
                {
                    title: "Service scope",
                    body: "IKIGAI provides digital setup and execution support for services such as WhatsApp Business setup, product listing, restaurant onboarding, cloud kitchen setup, social media setup, and website or store setup.",
                },
                {
                    title: "Client responsibilities",
                    body: "Clients are responsible for providing accurate business information, required documents, images, access details, payment information, and timely responses needed to complete service tasks.",
                },
                {
                    title: "Payments",
                    body: "Clients must complete payment before task execution begins. Pricing may include base amount, GST where applicable, platform fee, and total payable amount shown during checkout.",
                },
                {
                    title: "Execution partners",
                    body: "IKIGAI may coordinate tasks through trained partners. Partner access is managed and limited to task requirements approved by IKIGAI workflows.",
                },
                {
                    title: "Limitations",
                    body: "Platform approvals, third-party marketplace listings, account verification, and delivery app acceptance may depend on external rules and documents provided by the client.",
                },
            ]}
        />
    );
}
