import crypto from "crypto";
import Razorpay from "razorpay";

export function getRazorpayCredentials() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error("Razorpay environment variables are not configured.");
    }

    return { keyId, keySecret };
}

export async function createRazorpayOrder({ amount, receipt, notes = {} }) {
    const { keyId, keySecret } = getRazorpayCredentials();
    const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });

    try {
        return await razorpay.orders.create({
            amount,
            currency: "INR",
            receipt: String(receipt || `ikg_${Date.now()}`).slice(0, 40),
            notes,
        });
    } catch (error) {
        throw new Error(error?.error?.description || error?.message || "Could not create Razorpay order.");
    }
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
    const { keySecret } = getRazorpayCredentials();
    const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

    if (!signature || expectedSignature.length !== signature.length) {
        return false;
    }

    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
    );
}
