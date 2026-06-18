const mockDelay = 120;

function wait(ms = mockDelay) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockExternalId(channel, product = {}) {
    const suffix = String(product.id || product.sku || Date.now()).replace(/[^a-z0-9]/gi, "").slice(-10);
    return `${channel}-${suffix || Date.now()}`;
}

export async function connectMetaAccount(channel) {
    await wait();
    return {
        ok: true,
        channel,
        status: "connected",
        external_account_name: `ORVA Demo ${channel}`,
    };
}

export async function syncProductToWhatsapp(product) {
    await wait();
    return { ok: true, external_id: mockExternalId("whatsapp", product) };
}

export async function publishInstagramPost(product) {
    await wait();
    return { ok: true, external_id: mockExternalId("instagram", product) };
}

export async function publishFacebookPost(product) {
    await wait();
    return { ok: true, external_id: mockExternalId("facebook", product) };
}

