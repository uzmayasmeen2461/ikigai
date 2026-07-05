import {
    publishFacebookPost,
    publishInstagramPost,
} from "./meta";

export const syncChannels = ["instagram", "facebook"];

const channelHandlers = {
    instagram: publishInstagramPost,
    facebook: publishFacebookPost,
};

function shouldMockFail(product = {}, channel = "") {
    const text = `${product.id || ""}${product.sku || product.product_code || ""}${channel}`;
    const score = [...text].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return score % 11 === 0;
}

export async function syncProductToChannel(product, channel) {
    if (!channelHandlers[channel]) {
        return { ok: false, error_message: "Unsupported channel." };
    }

    if (shouldMockFail(product, channel)) {
        return { ok: false, error_message: "Mock channel timeout. Retry sync." };
    }

    return channelHandlers[channel](product);
}
