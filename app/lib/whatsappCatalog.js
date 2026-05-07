export function sanitizeText(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim();
}

export function slugify(value = "") {
    return sanitizeText(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
}

export function isWhatsAppServiceType(value = "") {
    const normalized = sanitizeText(value).toLowerCase();
    return normalized.includes("whatsapp") || normalized.includes("catalog");
}

export function formatCatalogPrice(value = "") {
    const numericValue = Number(String(value || "").replace(/[^\d.]/g, ""));

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return "Price not provided";
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(numericValue);
}

export const quickCatalogCategories = [
    "Cosmetics",
    "Handbags",
    "Dresses",
    "Perfumes",
    "Skincare",
    "Accessories",
];

const categoryCodeMap = {
    cosmetics: "COS",
    handbags: "BAG",
    dresses: "FAS",
    perfumes: "PRF",
    skincare: "SKN",
    accessories: "ACC",
    fashion: "FAS",
};

export const whatsappCatalogTemplates = {
    boutique: {
        label: "Boutique",
        businessCategory: "Boutique",
        businessDescription:
            "Premium fashion pieces, curated collections, and sizing help for customers shopping on WhatsApp.",
        workingHours: "11 AM - 8 PM",
        sampleProducts: [
            { productName: "Cotton Kurti", category: "Women Wear", availability: "In stock" },
            { productName: "Festive Dupatta", category: "Accessories", availability: "Limited stock" },
        ],
        checklistRequirements: ["Logo", "Product photos", "Sizes", "Prices"],
        quickReplies: {
            price: "Share the design screenshot or product name and we will confirm the latest boutique price.",
            delivery: "We can confirm delivery timelines after you share your area and preferred pieces.",
            payment: "Payment details are shared once your order selection is final.",
            timings: "Boutique support is available during listed working hours for orders and styling help.",
        },
    },
    restaurant: {
        label: "Restaurant",
        businessCategory: "Restaurant",
        businessDescription:
            "Daily menu, delivery information, and quick WhatsApp ordering support for restaurant customers.",
        workingHours: "9 AM - 11 PM",
        sampleProducts: [
            { productName: "Chicken Biryani", category: "Main Course", availability: "In stock" },
            { productName: "Family Meal Box", category: "Combos", availability: "Made to order" },
        ],
        checklistRequirements: ["Menu", "Food photos", "Address", "Delivery zones"],
        quickReplies: {
            price: "Share the dish name and quantity, and we will confirm the current menu price.",
            delivery: "Please send your area or location pin so we can confirm delivery availability.",
            payment: "Online payment details are shared once the order is confirmed.",
            timings: "Restaurant orders are handled during our listed service hours.",
        },
    },
    bakery: {
        label: "Bakery",
        businessCategory: "Bakery",
        businessDescription:
            "Fresh bakery items, custom cake requests, and order updates handled smoothly on WhatsApp.",
        workingHours: "10 AM - 9 PM",
        sampleProducts: [
            { productName: "Chocolate Cake", category: "Cakes", availability: "Made to order" },
            { productName: "Butter Cookies", category: "Snacks", availability: "In stock" },
        ],
        checklistRequirements: ["Product photos", "Flavours", "Advance order note", "Prices"],
        quickReplies: {
            price: "Tell us the cake size or bakery item you need and we will share pricing quickly.",
            delivery: "Share your location and required delivery date so we can confirm availability.",
            payment: "Advance payment details are shared once the bakery order is finalized.",
            timings: "Bakery support is available during our listed store timings.",
        },
    },
    home_food_business: {
        label: "Home Food Business",
        businessCategory: "Home Food Business",
        businessDescription:
            "Homemade meals and snacks with simple ordering updates, customisation details, and pickup or delivery guidance.",
        workingHours: "10 AM - 8 PM",
        sampleProducts: [
            { productName: "Weekly Lunch Box", category: "Meals", availability: "Made to order" },
            { productName: "Evening Snack Box", category: "Snacks", availability: "Limited stock" },
        ],
        checklistRequirements: ["Menu", "Order lead time", "Pickup or delivery details", "Payment note"],
        quickReplies: {
            price: "Please share the meal or snack name and quantity so we can confirm the final amount.",
            delivery: "We can confirm home delivery or pickup details once you share your area.",
            payment: "Payment details are shared once your homemade order is confirmed.",
            timings: "Orders are handled during our listed kitchen hours.",
        },
    },
    salon: {
        label: "Salon",
        businessCategory: "Salon",
        businessDescription:
            "Appointment support, service pricing, and quick WhatsApp follow-up for beauty and salon clients.",
        workingHours: "10 AM - 8 PM",
        sampleProducts: [
            { productName: "Haircut Service", category: "Hair", availability: "In stock" },
            { productName: "Bridal Package", category: "Bridal", availability: "Made to order" },
        ],
        checklistRequirements: ["Service list", "Pricing", "Location", "Booking policy"],
        quickReplies: {
            price: "Share the salon service you want and we will confirm the latest pricing and slot details.",
            delivery: "Please send your preferred branch or area so we can guide you correctly.",
            payment: "Payment details for booking are shared after appointment confirmation.",
            timings: "Salon appointments are managed during our listed working hours.",
        },
    },
    grocery_store: {
        label: "Grocery Store",
        businessCategory: "Grocery Store",
        businessDescription:
            "Fast WhatsApp ordering for household essentials, item availability, and nearby delivery support.",
        workingHours: "8 AM - 10 PM",
        sampleProducts: [
            { productName: "Daily Essentials Combo", category: "Combos", availability: "In stock" },
            { productName: "Fresh Vegetables Pack", category: "Fresh Produce", availability: "In stock" },
        ],
        checklistRequirements: ["Product list", "Delivery radius", "Store timings", "Payment details"],
        quickReplies: {
            price: "Send the grocery item name or list and we will confirm pricing and availability.",
            delivery: "We deliver to nearby areas. Share your location to confirm delivery support.",
            payment: "Payment details are shared once the grocery order is packed and confirmed.",
            timings: "Store support is available during our listed working hours.",
        },
    },
    electronics_shop: {
        label: "Electronics Shop",
        businessCategory: "Electronics Shop",
        businessDescription:
            "Device enquiries, accessory recommendations, and quick WhatsApp support for electronics buyers.",
        workingHours: "10 AM - 9 PM",
        sampleProducts: [
            { productName: "Bluetooth Speaker", category: "Audio", availability: "In stock" },
            { productName: "Fast Charger", category: "Accessories", availability: "In stock" },
        ],
        checklistRequirements: ["Product model names", "Warranty note", "Prices", "Store address"],
        quickReplies: {
            price: "Please share the product model or screenshot so we can confirm the latest electronics pricing.",
            delivery: "Share your area to check delivery or pickup availability.",
            payment: "Payment details are shared after product availability is confirmed.",
            timings: "Support for product enquiries is available during our listed store hours.",
        },
    },
};

export function createEmptyProduct() {
    return {
        id: crypto.randomUUID(),
        productName: "",
        category: "",
        price: "",
        descriptionNotes: "",
        imageUrl: "",
        availability: "In stock",
        sku: "",
        itemCode: "",
        sourceImageId: "",
        cropNote: "",
        isBestSeller: false,
        isNewArrival: false,
        originalImageUrl: "",
        cleanedImageUrl: "",
        providerUsed: "",
        imageSource: "manual_crop",
        detectionBox: null,
        detectionConfidence: 0,
        originalShelfImageId: "",
    };
}

export function createShelfImage(image = {}) {
    return {
        id: image.id || crypto.randomUUID(),
        name: sanitizeText(image.name || "Shelf photo"),
        previewUrl: image.previewUrl || image.dataUrl || "",
        dataUrl: image.dataUrl || image.previewUrl || "",
        file: image.file || null,
        isObjectUrl: Boolean(image.isObjectUrl),
        uploadedAt: image.uploadedAt || new Date().toISOString(),
    };
}

export function normalizeShelfImages(images = []) {
    return (images || []).map((image) => createShelfImage(image));
}

export function generateProductCode(category = "", existingProducts = []) {
    const normalizedCategory = sanitizeText(category).toLowerCase();
    const prefix =
        Object.entries(categoryCodeMap).find(([key]) => normalizedCategory.includes(key))?.[1] ||
        slugify(category).slice(0, 3).toUpperCase() ||
        "IDG";

    const matchingCount = (existingProducts || []).filter((product) => {
        const code = sanitizeText(product.itemCode || product.sku);
        return code.startsWith(prefix);
    }).length;

    return `${prefix}${String(matchingCount + 1).padStart(3, "0")}`;
}

function titleCaseTokens(tokens = []) {
    return tokens
        .filter(Boolean)
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(" ");
}

export function suggestCatalogFieldsFromImage(imageName = "", businessCategory = "") {
    const source = sanitizeText(imageName)
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[_-]+/g, " ");
    const tokens = source
        .split(" ")
        .map((token) => token.toLowerCase())
        .filter((token) => token && !["img", "image", "photo", "shelf", "whatsapp", "catalog"].includes(token));

    const categoryMap = [
        { keywords: ["kurti", "dress", "dupatta", "shirt", "jeans", "top"], category: "Women Wear" },
        { keywords: ["cake", "brownie", "cookie", "bread", "cupcake"], category: "Bakery" },
        { keywords: ["biryani", "meal", "burger", "pizza", "combo"], category: "Main Course" },
        { keywords: ["charger", "speaker", "earbuds", "cable", "phone"], category: "Electronics" },
        { keywords: ["rice", "oil", "atta", "vegetable", "snack"], category: "Grocery" },
        { keywords: ["cream", "facial", "hair", "spa"], category: "Salon Care" },
    ];

    const matchingCategory =
        categoryMap.find((item) => item.keywords.some((keyword) => tokens.includes(keyword)))?.category ||
        sanitizeText(businessCategory) ||
        "General";
    const suggestedName = titleCaseTokens(tokens.slice(0, 4)) || "Shelf Product";
    const suggestedDescription = `Shelf photo reference prepared for ${matchingCategory.toLowerCase()} catalog review. Add pricing, final product notes, and stock confirmation before publishing.`;

    return {
        suggestedName,
        suggestedCategory: matchingCategory,
        suggestedDescription,
        suggestedTags: [matchingCategory, ...tokens.slice(0, 2)].filter(Boolean),
    };
}

export function normalizeBusinessData(business = {}) {
    return {
        clientName: sanitizeText(business.clientName),
        businessName: sanitizeText(business.businessName),
        businessCategory: sanitizeText(business.businessCategory),
        phone: sanitizeText(business.phone),
        address: sanitizeText(business.address),
        supportEmail: sanitizeText(business.supportEmail),
        workingHours: sanitizeText(business.workingHours),
        businessDescription: sanitizeText(business.businessDescription),
        logoUrl: sanitizeText(business.logoUrl),
        notes: sanitizeText(business.notes),
        templateType: sanitizeText(business.templateType),
    };
}

export function normalizeProduct(product = {}) {
    return {
        ...createEmptyProduct(),
        ...product,
        id: product.id || crypto.randomUUID(),
        productName: sanitizeText(product.productName),
        category: sanitizeText(product.category),
        price: sanitizeText(product.price),
        descriptionNotes: sanitizeText(product.descriptionNotes),
        imageUrl: sanitizeText(product.imageUrl),
        availability: sanitizeText(product.availability) || "In stock",
        sku: sanitizeText(product.sku),
        itemCode: sanitizeText(product.itemCode),
        sourceImageId: sanitizeText(product.sourceImageId),
        cropNote: sanitizeText(product.cropNote),
        isBestSeller: Boolean(product.isBestSeller),
        isNewArrival: Boolean(product.isNewArrival),
        originalImageUrl: sanitizeText(product.originalImageUrl),
        cleanedImageUrl: sanitizeText(product.cleanedImageUrl),
        providerUsed: sanitizeText(product.providerUsed),
        imageSource: sanitizeText(product.imageSource) || "manual_crop",
        detectionBox: product.detectionBox || null,
        detectionConfidence: Number(product.detectionConfidence || 0),
        originalShelfImageId: sanitizeText(product.originalShelfImageId),
    };
}

export function isEmptyProduct(product = {}) {
    const normalized = normalizeProduct(product);

    return ![
        normalized.productName,
        normalized.category,
        normalized.price,
        normalized.descriptionNotes,
        normalized.imageUrl,
        normalized.availability !== "In stock" ? normalized.availability : "",
        normalized.sku,
    ].some(Boolean);
}

export function normalizeProducts(products = []) {
    return (products || []).map(normalizeProduct);
}

export function getRealProducts(products = []) {
    return normalizeProducts(products).filter((product) => !isEmptyProduct(product));
}

export function applyTemplateToDraft(templateType, currentBusiness = {}, currentProducts = []) {
    const template = whatsappCatalogTemplates[templateType];

    if (!template) {
        return {
            business: normalizeBusinessData(currentBusiness),
            products: getRealProducts(currentProducts),
        };
    }

    const business = normalizeBusinessData({
        ...currentBusiness,
        businessCategory: template.businessCategory,
        businessDescription: template.businessDescription,
        workingHours: currentBusiness.workingHours || template.workingHours,
        templateType,
    });

    const products = getRealProducts(currentProducts).length
        ? getRealProducts(currentProducts)
        : template.sampleProducts.map((product) => normalizeProduct(product));

    return { business, products };
}

export function buildGeneratedProduct(product, businessCategory = "") {
    const normalizedProduct = normalizeProduct(product);
    const name = normalizedProduct.productName;
    const category = sanitizeText(normalizedProduct.category || businessCategory || "General");
    const descriptionNotes = normalizedProduct.descriptionNotes;
    const formattedPrice = formatCatalogPrice(normalizedProduct.price);
    const availability = normalizedProduct.availability || "Available";
    const baseCode = slugify(category).slice(0, 3).toUpperCase() || "IDG";
    const nameCode = slugify(name).replace(/-/g, "").slice(0, 4).toUpperCase() || "ITEM";
    const itemCode = normalizedProduct.itemCode || `${baseCode}-${nameCode}`;
    const sku = normalizedProduct.sku || itemCode;
    const premiumTitle = [name, category !== "General" ? `for ${category}` : "", normalizedProduct.isNewArrival ? "New Arrival" : ""]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    const cleanedTitle = premiumTitle || [name, category !== "General" ? category : ""].filter(Boolean).join(" • ");
    const shortDescription = descriptionNotes
        ? `${descriptionNotes}. ${availability}.`
        : `${name || "Product"} for quick WhatsApp enquiries. ${availability}.`;
    const salesDescription = descriptionNotes
        ? `${descriptionNotes}. Great for fast WhatsApp ordering. ${availability}.`
        : `${cleanedTitle || "This product"} is ready for quick WhatsApp orders. ${availability}.`;
    const tags = Array.from(
        new Set(
            [
                category,
                businessCategory,
                availability,
                name.split(" ")[0],
                normalizedProduct.isBestSeller ? "Best Seller" : "",
                normalizedProduct.isNewArrival ? "New Arrival" : "",
            ]
                .map(sanitizeText)
                .filter(Boolean)
        )
    ).slice(0, 4);
    const whatsappReadyCopy = [
        `*Product:* ${cleanedTitle || "Unnamed product"}`,
        `*Price:* ${formattedPrice}`,
        `*Details:* ${salesDescription}`,
        itemCode ? `*Code:* ${itemCode}` : "",
    ]
        .filter(Boolean)
        .join("\n");

    return {
        ...normalizedProduct,
        cleanedTitle: cleanedTitle || "Unnamed product",
        premiumTitle: cleanedTitle || "Unnamed product",
        categoryLabel: category,
        formattedPrice,
        shortDescription,
        salesDescription,
        suggestedTags: tags,
        uploadReadySummary: `${itemCode} | ${cleanedTitle || "Unnamed product"} | ${formattedPrice} | ${availability}`,
        sku,
        itemCode,
        isBestSeller: normalizedProduct.isBestSeller,
        isNewArrival: normalizedProduct.isNewArrival,
        whatsappReadyCopy,
        orderFormat: "Send product code + address",
        originalImageUrl: normalizedProduct.originalImageUrl || normalizedProduct.imageUrl,
        cleanedImageUrl: normalizedProduct.cleanedImageUrl,
        providerUsed: normalizedProduct.providerUsed,
    };
}

export function groupGeneratedProducts(products = []) {
    return products.reduce((groups, product) => {
        const key = product.categoryLabel || "General";
        if (!groups[key]) groups[key] = [];
        groups[key].push(product);
        return groups;
    }, {});
}

export function buildChecklist({ business, products }) {
    const normalizedBusiness = normalizeBusinessData(business);
    const generatedProducts = getRealProducts(products).map((product) =>
        buildGeneratedProduct(product, normalizedBusiness.businessCategory)
    );
    const hasProducts = generatedProducts.length > 0;
    const allPricesPresent = generatedProducts.every((product) => product.formattedPrice !== "Price not provided");
    const allDescriptionsPresent = generatedProducts.every((product) => sanitizeText(product.descriptionNotes || product.shortDescription));
    const allImagesPresent = generatedProducts.every((product) => sanitizeText(product.imageUrl));
    const template = whatsappCatalogTemplates[normalizedBusiness.templateType];

    const baseChecklist = [
        { id: "phone", label: "Phone number provided", complete: Boolean(normalizedBusiness.phone) },
        { id: "logo", label: "Logo provided", complete: Boolean(normalizedBusiness.logoUrl) },
        { id: "product_images", label: "Product images provided", complete: hasProducts && allImagesPresent },
        { id: "prices", label: "Prices provided", complete: hasProducts && allPricesPresent },
        { id: "descriptions", label: "Descriptions completed", complete: hasProducts && allDescriptionsPresent },
        { id: "address", label: "Address provided", complete: Boolean(normalizedBusiness.address) },
        { id: "hours", label: "Working hours provided", complete: Boolean(normalizedBusiness.workingHours) },
    ];

    if (!template?.checklistRequirements?.length) {
        return baseChecklist;
    }

    const notesText = `${normalizedBusiness.notes} ${normalizedBusiness.businessDescription}`.toLowerCase();

    return [
        ...baseChecklist,
        ...template.checklistRequirements.map((item) => ({
            id: `template-${slugify(item)}`,
            label: `${item} noted`,
            complete: notesText.includes(item.toLowerCase()) || generatedProducts.some((product) => product.categoryLabel.toLowerCase().includes(item.toLowerCase())),
        })),
    ];
}

export function buildProfileContent(business, generatedProducts = []) {
    const normalizedBusiness = normalizeBusinessData(business);
    const template = whatsappCatalogTemplates[normalizedBusiness.templateType];
    const businessName = sanitizeText(normalizedBusiness.businessName || "Your Business");
    const category = sanitizeText(normalizedBusiness.businessCategory || "business");
    const city = sanitizeText(normalizedBusiness.address || "your area");
    const summaryTags = generatedProducts.slice(0, 3).map((item) => item.cleanedTitle).filter(Boolean);

    return {
        shortDescription: `${businessName} helps customers discover ${category} products and updates quickly on WhatsApp.`,
        aboutText: summaryTags.length
            ? `${businessName} | ${category} | ${summaryTags.join(" | ")}`
            : `${businessName} | ${category} | WhatsApp enquiries welcome`,
        greetingMessage: `Hi, welcome to ${businessName}. Thanks for reaching out. Let us know what you need and we will help you quickly.`,
        awayMessage: `Thank you for messaging ${businessName}. We are away right now, but we will respond during working hours.`,
        quickReplies: [
            {
                label: "Price",
                text:
                    template?.quickReplies?.price ||
                    `Thanks for your interest. Please share the product name or screenshot and ${businessName} will confirm the latest price.`,
            },
            {
                label: "Delivery",
                text:
                    template?.quickReplies?.delivery ||
                    `We deliver in ${city}. Share your location and product details so we can confirm delivery options.`,
            },
            {
                label: "Payment",
                text:
                    template?.quickReplies?.payment ||
                    "We will share payment details after confirming your order items and final amount.",
            },
            {
                label: "Timings",
                text:
                    template?.quickReplies?.timings ||
                    `Our working hours are ${sanitizeText(normalizedBusiness.workingHours || "shared on request")}.`,
            },
            {
                label: "Order Format",
                text: "To place an order, please send product code + address on WhatsApp.",
            },
        ],
        faqReplies: [
            {
                question: "What do you sell?",
                answer: summaryTags.length
                    ? `${businessName} currently highlights ${summaryTags.join(", ")} and related ${category} items.`
                    : `${businessName} offers ${category} items and customer support on WhatsApp.`,
            },
            {
                question: "How do I order?",
                answer: "Send product code + address, and we will confirm availability, final amount, and next steps.",
            },
            {
                question: "Can I get your address?",
                answer: sanitizeText(normalizedBusiness.address || "Address will be shared by the business owner."),
            },
        ],
    };
}

export function calculateCompletionScore({ business, generatedProducts, checklist }) {
    const normalizedBusiness = normalizeBusinessData(business);
    const products = generatedProducts || [];
    const scoreItems = [
        Boolean(normalizedBusiness.businessName),
        Boolean(normalizedBusiness.phone),
        Boolean(normalizedBusiness.address),
        Boolean(normalizedBusiness.businessDescription),
        products.length > 0,
        products.length > 0 && products.every((product) => product.formattedPrice !== "Price not provided"),
        products.length > 0 && products.every((product) => sanitizeText(product.shortDescription)),
        checklist.length > 0 && checklist.every((item) => item.complete),
    ];

    return Math.round((scoreItems.filter(Boolean).length / scoreItems.length) * 100);
}

export function determineProjectStatus({ checklist, exportedAt }) {
    if (exportedAt) return "completed";
    if (checklist.length > 0 && checklist.every((item) => item.complete)) return "ready";
    return "draft";
}

export function generateCatalogKit({ business, products, exportedAt = null }) {
    const normalizedBusiness = normalizeBusinessData(business);
    const generatedProducts = getRealProducts(products).map((product) =>
        buildGeneratedProduct(product, normalizedBusiness.businessCategory)
    );
    const checklist = buildChecklist({ business: normalizedBusiness, products: generatedProducts });
    const generatedProfile = buildProfileContent(normalizedBusiness, generatedProducts);
    const groupedProducts = groupGeneratedProducts(generatedProducts);
    const completionScore = calculateCompletionScore({
        business: normalizedBusiness,
        generatedProducts,
        checklist,
    });
    const status = determineProjectStatus({ checklist, exportedAt });

    return {
        generatedProducts,
        groupedProducts,
        generatedProfile,
        checklist,
        completionScore,
        status,
        stats: {
            products: generatedProducts.length,
            completedChecklist: checklist.filter((item) => item.complete).length,
            totalChecklist: checklist.length,
        },
    };
}

export function buildCatalogCsv(generatedProducts = []) {
    const headers = [
        "Item Code",
        "Product Name",
        "Category",
        "Price",
        "Generated Title",
        "Generated Description",
        "Availability",
        "SKU",
        "Best Seller",
        "New Arrival",
        "Original Image URL",
        "Cleaned Image URL",
        "Provider Used",
        "WhatsApp Copy",
    ];

    const rows = generatedProducts.map((product) => [
        product.itemCode,
        product.productName || product.cleanedTitle,
        product.categoryLabel,
        product.formattedPrice,
        product.premiumTitle || product.cleanedTitle,
        product.salesDescription || product.shortDescription,
        product.availability,
        product.sku,
        product.isBestSeller ? "Yes" : "No",
        product.isNewArrival ? "Yes" : "No",
        product.originalImageUrl,
        product.cleanedImageUrl || product.imageUrl,
        product.providerUsed,
        product.whatsappReadyCopy,
    ]);

    return [headers, ...rows]
        .map((row) =>
            row
                .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
                .join(",")
        )
        .join("\n");
}

export function buildChecklistText({ business, checklist, generatedProducts }) {
    const completedItems = checklist.filter((item) => item.complete);
    const missingItems = checklist.filter((item) => !item.complete);

    return [
        "ikigaidigital WhatsApp Catalog Assistant",
        `Business: ${sanitizeText(business.businessName || "Not provided")}`,
        `Category: ${sanitizeText(business.businessCategory || "Not provided")}`,
        `Phone: ${sanitizeText(business.phone || "Not provided")}`,
        `Working hours: ${sanitizeText(business.workingHours || "Not provided")}`,
        "",
        "Completed Items",
        ...(completedItems.length ? completedItems.map((item) => `- ${item.label}`) : ["- None yet"]),
        "",
        "Missing Items",
        ...(missingItems.length ? missingItems.map((item) => `- ${item.label}`) : ["- No missing items"]),
        "",
        "Final Setup Steps",
        "- Review WhatsApp business profile text",
        "- Confirm product photos and pricing with the client",
        "- Complete WhatsApp Business verification with the business owner",
        "- Publish the final catalog and quick replies",
        "",
        "Products",
        ...generatedProducts.map((product) => `- ${product.uploadReadySummary}${product.cleanedImageUrl ? ` | Cleaned image: ${product.cleanedImageUrl}` : ""}`),
    ].join("\n");
}

export function buildQuickRepliesText(profile = {}) {
    const quickReplies = profile.quickReplies || [];
    const faqReplies = profile.faqReplies || [];

    return [
        "Greeting Message",
        profile.greetingMessage || "",
        "",
        "Away Message",
        profile.awayMessage || "",
        "",
        "Quick Replies",
        ...quickReplies.map((item) => `- ${item.label}: ${item.text}`),
        "",
        "FAQ Replies",
        ...faqReplies.map((item) => `- ${item.question}: ${item.answer}`),
    ].join("\n");
}

export function buildBulkQuickRepliesText({ business, generatedProducts = [], profile = {} }) {
    const businessName = sanitizeText(business.businessName || "Business");
    const grouped = groupGeneratedProducts(generatedProducts);

    return [
        `Bulk Quick Replies - ${businessName}`,
        "",
        "Core Replies",
        ...((profile.quickReplies || []).map((item) => `- ${item.label}: ${item.text}`)),
        "",
        "Category Replies",
        ...Object.entries(grouped).map(
            ([category, items]) =>
                `- ${category}: We currently have ${items.length} option${items.length > 1 ? "s" : ""} ready. Send product code + address to order.`
        ),
        "",
        "Customer Order Format",
        "Send product code + address",
    ].join("\n");
}

export function buildProfileText(profile = {}) {
    return [
        "WhatsApp Business Profile",
        `Short Description: ${profile.shortDescription || ""}`,
        `About Text: ${profile.aboutText || ""}`,
        "",
        "Greeting Message",
        profile.greetingMessage || "",
        "",
        "Away Message",
        profile.awayMessage || "",
    ].join("\n");
}

export function buildBusinessProfileText({ business = {}, generatedProfile = {} }) {
    return [
        "Business Profile",
        `Business Name: ${sanitizeText(business.businessName || "Not provided")}`,
        `About Text: ${generatedProfile.aboutText || generatedProfile.shortDescription || "Not provided"}`,
        `Address: ${sanitizeText(business.address || "Not provided")}`,
        `Hours: ${sanitizeText(business.workingHours || "Not provided")}`,
        `Phone: ${sanitizeText(business.phone || "Not provided")}`,
        `Email: ${sanitizeText(business.supportEmail || "Not provided")}`,
    ].join("\n");
}

export function buildQuickRepliesExportText({ business = {}, profile = {} }) {
    const quickReplyMap = Object.fromEntries(
        (profile.quickReplies || []).map((item) => [
            sanitizeText(item.label).toLowerCase(),
            item.text || "",
        ])
    );

    return [
        "Quick Replies",
        `Greeting: ${profile.greetingMessage || ""}`,
        `Away: ${profile.awayMessage || ""}`,
        `Price: ${quickReplyMap.price || ""}`,
        `Delivery: ${quickReplyMap.delivery || ""}`,
        `Payment: ${quickReplyMap.payment || ""}`,
        `Order format: Send product code + address`,
        business?.workingHours ? `Store timing: ${sanitizeText(business.workingHours)}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}

export function buildProductCopyPasteText(generatedProducts = []) {
    return generatedProducts
        .map(
            (product, index) =>
                [
                    `Product ${index + 1}`,
                    `Name: ${product.premiumTitle || product.cleanedTitle || product.productName || "Not provided"}`,
                    `Price: ${product.formattedPrice || "Price not provided"}`,
                    `Description: ${product.salesDescription || product.shortDescription || "Description not provided"}`,
                    `Code: ${product.itemCode || product.sku || "Code not provided"}`,
                    "",
                ].join("\n")
        )
        .join("\n");
}

export function buildSetupGuideText() {
    return [
        "WhatsApp Setup Guide",
        "",
        "Step 1 Upload images into WhatsApp Catalog",
        "Step 2 Copy title + price + description from product-copy-paste.txt",
        "Step 3 Save each product",
    ].join("\n");
}

export function buildWhatsAppKitCatalogCsv(generatedProducts = [], imageFilenames = {}) {
    const headers = [
        "SKU",
        "Product Name",
        "Category",
        "Price",
        "Description",
        "Availability",
        "Image Filename",
    ];

    const rows = generatedProducts.map((product) => [
        product.itemCode || product.sku || "",
        product.premiumTitle || product.cleanedTitle || product.productName || "",
        product.categoryLabel || product.category || "",
        product.formattedPrice || "",
        product.salesDescription || product.shortDescription || "",
        product.availability || "",
        imageFilenames[product.id] || "",
    ]);

    return [headers, ...rows]
        .map((row) =>
            row
                .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
                .join(",")
        )
        .join("\n");
}

export function buildFullKitText({ business, generatedProfile, generatedProducts, checklist, status, completionScore }) {
    return [
        `ikigaidigital WhatsApp Catalog Kit`,
        `Business: ${sanitizeText(business.businessName || "Not provided")}`,
        `Category: ${sanitizeText(business.businessCategory || "Not provided")}`,
        `Status: ${status || "draft"}`,
        `Completion score: ${completionScore || 0}%`,
        "",
        buildProfileText(generatedProfile),
        "",
        buildBulkQuickRepliesText({ business, generatedProducts, profile: generatedProfile }),
        "",
        buildQuickRepliesText(generatedProfile),
        "",
        buildChecklistText({ business, checklist, generatedProducts }),
        "",
        "Image References",
        ...generatedProducts.map(
            (product) =>
                `- ${product.itemCode || product.sku || product.cleanedTitle}: ${product.cleanedImageUrl || product.imageUrl || "No image"}${product.providerUsed ? ` (${product.providerUsed})` : ""}`
        ),
    ].join("\n");
}

function guessImageExtension(contentType = "", fallbackUrl = "") {
    if (contentType.includes("png")) return "png";
    if (contentType.includes("webp")) return "webp";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
    if (contentType.includes("gif")) return "gif";
    const path = sanitizeText(fallbackUrl).split("?")[0];
    const match = path.match(/\.([a-zA-Z0-9]+)$/);
    return match?.[1]?.toLowerCase() || "jpg";
}

async function imageReferenceToBlob(reference = "") {
    const imageUrl = sanitizeText(reference);
    if (!imageUrl) return null;

    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Could not fetch image: ${imageUrl}`);
    }

    return response.blob();
}

export async function buildWhatsAppKitZip({
    business = {},
    generatedProfile = {},
    generatedProducts = [],
    checklist = [],
    status = "draft",
    completionScore = 0,
}) {
    const JSZipModule = await import("jszip");
    const JSZip = JSZipModule.default;
    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    const imageFilenames = {};

    await Promise.all(
        generatedProducts.map(async (product, index) => {
            const imageReference = sanitizeText(product.cleanedImageUrl || product.imageUrl || product.originalImageUrl);
            if (!imageReference) return;

            try {
                const blob = await imageReferenceToBlob(imageReference);
                if (!blob) return;
                const extension = guessImageExtension(blob.type, imageReference);
                const filename = `product-${index + 1}.${extension}`;
                imagesFolder.file(filename, blob);
                imageFilenames[product.id] = filename;
            } catch {
                imageFilenames[product.id] = "";
            }
        })
    );

    zip.file(
        "catalog.csv",
        buildWhatsAppKitCatalogCsv(generatedProducts, imageFilenames)
    );
    zip.file(
        "business-profile.txt",
        buildBusinessProfileText({ business, generatedProfile })
    );
    zip.file(
        "quick-replies.txt",
        buildQuickRepliesExportText({ business, profile: generatedProfile })
    );
    zip.file(
        "product-copy-paste.txt",
        buildProductCopyPasteText(generatedProducts)
    );
    zip.file("setup-guide.txt", buildSetupGuideText());
    zip.file(
        "full-kit-notes.txt",
        buildFullKitText({
            business,
            generatedProfile,
            generatedProducts,
            checklist,
            status,
            completionScore,
        })
    );

    return zip.generateAsync({ type: "blob" });
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

export function buildPrintableMiniCatalogHtml({ business, generatedProducts = [] }) {
    const businessName = sanitizeText(business.businessName || "ikigaidigital Catalog");
    const category = sanitizeText(business.businessCategory || "WhatsApp Catalog");
    const productCards = generatedProducts
        .map(
            (product) => `
                <div class="card">
                    ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.cleanedTitle)}" class="image" />` : ""}
                    <div class="meta">
                        <div class="top">
                            <span class="code">${escapeHtml(product.itemCode)}</span>
                            <span class="price">${escapeHtml(product.formattedPrice)}</span>
                        </div>
                        <h3>${escapeHtml(product.premiumTitle || product.cleanedTitle)}</h3>
                        <p>${escapeHtml(product.salesDescription || product.shortDescription)}</p>
                        <div class="tags">
                            ${product.isBestSeller ? `<span class="tag tag-dark">Best Seller</span>` : ""}
                            ${product.isNewArrival ? `<span class="tag tag-blue">New Arrival</span>` : ""}
                            <span class="tag">${escapeHtml(product.categoryLabel)}</span>
                        </div>
                        <div class="order">Order on WhatsApp: Send product code + address</div>
                    </div>
                </div>
            `
        )
        .join("");

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(businessName)} Mini Catalog</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .brand { font-size:28px; font-weight:700; letter-spacing:-0.03em; }
    .sub { color:#475569; margin-top:8px; max-width:520px; }
    .pill { display:inline-block; padding:8px 14px; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:12px; font-weight:700; }
    .grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:18px; }
    .card { border:1px solid #e2e8f0; border-radius:20px; overflow:hidden; break-inside:avoid; }
    .image { width:100%; height:220px; object-fit:cover; display:block; background:#f8fafc; }
    .meta { padding:18px; }
    .top { display:flex; justify-content:space-between; gap:16px; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.12em; }
    h3 { margin:12px 0 8px; font-size:18px; }
    p { margin:0; color:#475569; line-height:1.6; font-size:14px; }
    .tags { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
    .tag { padding:6px 10px; border-radius:999px; background:#f8fafc; border:1px solid #e2e8f0; font-size:12px; font-weight:700; color:#334155; }
    .tag-dark { background:#0f172a; border-color:#0f172a; color:white; }
    .tag-blue { background:#dbeafe; border-color:#bfdbfe; color:#1d4ed8; }
    .order { margin-top:14px; padding-top:14px; border-top:1px solid #e2e8f0; font-size:13px; font-weight:700; color:#0f172a; }
    @media print { body { margin: 20px; } .grid { grid-template-columns:repeat(2, minmax(0,1fr)); } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${escapeHtml(businessName)}</div>
      <div class="sub">${escapeHtml(category)} mini catalog prepared by ikigaidigital for WhatsApp-ready sharing.</div>
    </div>
    <div class="pill">Send product code + address</div>
  </div>
  <div class="grid">${productCards}</div>
</body>
</html>`;
}
