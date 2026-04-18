import { LegalPage } from "../../components/LegalPage";

export default function RefundPolicyPage() {
    return (
        <LegalPage
            eyebrow="IKIGAI Policy"
            title="Refund Policy"
            updated="18 April 2026"
            intro="IKIGAI offers fixed-price digital setup services. This policy explains how cancellations, failed payments, and refund requests are handled."
            sections={[
                {
                    title: "Before work starts",
                    body: "If payment is completed but IKIGAI has not started reviewing or executing the task, clients may request cancellation and refund review by contacting support.",
                },
                {
                    title: "After execution begins",
                    body: "Once task review, coordination, document preparation, listing setup, profile setup, or partner execution has started, refunds may be partial or unavailable depending on work already completed.",
                },
                {
                    title: "Failed or duplicate payments",
                    body: "If a payment fails, is deducted twice, or does not reflect correctly in the dashboard, contact support with payment details. Verified duplicate payments will be reviewed for refund.",
                },
                {
                    title: "Refund timeline",
                    body: "Approved refunds are typically processed through the original payment method. Bank or payment-provider timelines may vary.",
                },
                {
                    title: "Service changes",
                    body: "If client requirements change after payment, IKIGAI may revise scope, turnaround, or pricing before continuing execution.",
                },
            ]}
        />
    );
}
