import { productName, productStock } from "./inventory";

const trackedDetailFields = ["name", "product_name", "description", "notes", "image_url", "cleaned_image_url"];

function task(product, channel, taskType, title, description, priority = "medium", oldValue = null, newValue = null) {
    return {
        user_id: product.user_id || product.client_id,
        product_id: product.id,
        channel,
        task_type: taskType,
        title,
        description,
        priority,
        old_value: oldValue,
        new_value: newValue,
    };
}

function productLabel(product) {
    return productName(product) || "Product";
}

export function tasksForNewProduct(product) {
    const name = productLabel(product);
    return [
        task(product, "whatsapp_catalog", "new_product_upload", `Add ${name} to WhatsApp Catalog`, "Add the new product image, price, and description to the WhatsApp Business catalog.", "high"),
        task(product, "instagram", "social_post_required", `Create Instagram post for ${name}`, "Prepare a launch-ready Instagram caption, hashtags, and product image.", "medium"),
        task(product, "facebook_page", "social_post_required", `Create Facebook post for ${name}`, "Prepare a Facebook product post for the new item.", "medium"),
        task(product, "online_store", "new_product_upload", `Add ${name} to online store preview`, "Add the product to the storefront preview and confirm the stock status.", "high"),
    ];
}

export function tasksForProductChanges(before, after) {
    const name = productLabel(after);
    const oldStock = productStock(before);
    const newStock = productStock(after);
    const rows = [];

    if (oldStock !== newStock) {
        const values = { stock: oldStock };
        const nextValues = { stock: newStock };
        if (newStock === 0) {
            rows.push(
                task(after, "whatsapp_catalog", "out_of_stock_update", `Mark ${name} out of stock on WhatsApp`, "Update the WhatsApp catalog availability.", "high", values, nextValues),
                task(after, "online_store", "out_of_stock_update", `Mark ${name} out of stock in store preview`, "Update the storefront stock status.", "high", values, nextValues),
                task(after, "instagram", "social_post_required", `Prepare sold-out update for ${name}`, "Create an optional sold-out social update.", "medium", values, nextValues),
                task(after, "facebook_page", "social_post_required", `Prepare Facebook sold-out update for ${name}`, "Create an optional Facebook sold-out update.", "medium", values, nextValues),
            );
        } else if (oldStock === 0) {
            rows.push(
                task(after, "whatsapp_catalog", "back_in_stock_update", `Mark ${name} back in stock on WhatsApp`, "Update the WhatsApp catalog availability.", "high", values, nextValues),
                task(after, "online_store", "back_in_stock_update", `Mark ${name} back in stock in store preview`, "Update the storefront stock status.", "high", values, nextValues),
                task(after, "instagram", "social_post_required", `Prepare back-in-stock post for ${name}`, "Create an optional back-in-stock social update.", "medium", values, nextValues),
                task(after, "facebook_page", "social_post_required", `Prepare Facebook back-in-stock post for ${name}`, "Create an optional Facebook back-in-stock update.", "medium", values, nextValues),
            );
        } else {
            rows.push(
                task(after, "whatsapp_catalog", "stock_update", `Update WhatsApp stock for ${name}`, "Confirm the latest stock availability in the WhatsApp catalog.", "medium", values, nextValues),
                task(after, "online_store", "stock_update", `Update online store stock for ${name}`, "Update the storefront stock status.", "medium", values, nextValues),
            );
        }
    }

    if (Number(before.price || 0) !== Number(after.price || 0)) {
        const oldValue = { price: Number(before.price || 0) };
        const newValue = { price: Number(after.price || 0) };
        rows.push(
            task(after, "whatsapp_catalog", "price_update", `Update WhatsApp price for ${name}`, "Update the catalog price and confirm the visible amount.", "high", oldValue, newValue),
            task(after, "online_store", "price_update", `Update store price for ${name}`, "Update the storefront price.", "high", oldValue, newValue),
            task(after, "instagram", "social_post_required", `Prepare Instagram price update for ${name}`, "Refresh the social caption if a price update should be announced.", "low", oldValue, newValue),
            task(after, "facebook_page", "social_post_required", `Prepare Facebook price update for ${name}`, "Refresh the Facebook copy if a price update should be announced.", "low", oldValue, newValue),
        );
    }

    if (trackedDetailFields.some((field) => String(before[field] || "") !== String(after[field] || ""))) {
        rows.push(
            task(after, "whatsapp_catalog", "product_update", `Refresh WhatsApp details for ${name}`, "Update changed product details in the WhatsApp catalog.", "medium"),
            task(after, "online_store", "product_update", `Refresh store details for ${name}`, "Update changed product details in the storefront preview.", "medium"),
            task(after, "instagram", "social_post_required", `Regenerate social content for ${name}`, "Refresh Instagram content after the product detail change.", "medium"),
            task(after, "facebook_page", "social_post_required", `Regenerate Facebook content for ${name}`, "Refresh Facebook content after the product detail change.", "medium"),
        );
    }

    return rows;
}

export function changeLogsForProduct(before, after) {
    const fields = ["stock", "price", "name", "description", "image_url"];
    return fields
        .filter((field) => String(before[field] ?? "") !== String(after[field] ?? ""))
        .map((field) => ({
            user_id: after.user_id || after.client_id,
            product_id: after.id,
            field_name: field,
            old_value: String(before[field] ?? ""),
            new_value: String(after[field] ?? ""),
        }));
}

export async function insertUpdateTasks(supabase, rows = []) {
    if (!rows.length) return [];
    const { data, error } = await supabase.from("update_tasks").insert(rows).select("*");
    if (error) throw error;
    return data || [];
}
