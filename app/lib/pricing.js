export const GST_PERCENT = 18;
export const PLATFORM_FEE = 99;

export const servicePricing = {
    whatsapp: {
        label: "WhatsApp Business Setup",
        baseAmount: 2000,
    },
    instagram: {
        label: "Social Media Setup",
        baseAmount: 2499,
    },
    social: {
        label: "Social Media Setup",
        baseAmount: 2499,
    },
    zomato: {
        label: "Restaurant Listing",
        baseAmount: 3499,
    },
    restaurant: {
        label: "Restaurant Listing",
        baseAmount: 3499,
    },
    cloud_kitchen: {
        label: "Cloud Kitchen Setup",
        baseAmount: 4999,
    },
    website: {
        label: "Website / Store Setup",
        baseAmount: 7999,
    },
    listing: {
        label: "Product Listing",
        baseAmount: 1999,
    },
};

export function getServicePricing(serviceType = "whatsapp") {
    return servicePricing[serviceType] || servicePricing.whatsapp;
}

export function calculatePricing(serviceType = "whatsapp") {
    const service = getServicePricing(serviceType);
    const baseAmount = service.baseAmount;
    const gstAmount = Math.round((baseAmount * GST_PERCENT) / 100);
    const platformFee = PLATFORM_FEE;
    const totalAmount = baseAmount + gstAmount + platformFee;

    return {
        service_type: serviceType,
        service_label: service.label,
        base_amount: baseAmount,
        gst_percent: GST_PERCENT,
        gst_amount: gstAmount,
        platform_fee: platformFee,
        total_amount: totalAmount,
    };
}

export function formatINR(amount = 0) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(amount || 0));
}

export function amountToPaise(amount = 0) {
    return Math.round(Number(amount || 0) * 100);
}
