import { NextResponse } from "next/server";
import { clientForRequest, requireUser, roleForUser } from "../../../_shared";

const allowedActions = new Set(["dismiss", "mark_completed", "generate_content", "open_preview"]);

export async function POST(request, { params }) {
    try {
        const auth = await requireUser(request);
        if (auth.errorResponse) return auth.errorResponse;

        const body = await request.json().catch(() => ({}));
        const action = String(body.action || "").trim();
        if (!allowedActions.has(action)) return NextResponse.json({ error: "Unsupported recommendation action." }, { status: 400 });

        const role = await roleForUser(auth.user.id);
        const supabase = await clientForRequest(auth.token, role === "admin");
        const { data: recommendation, error: readError } = await supabase
            .from("inventory_recommendations")
            .select("*")
            .eq("id", params.id)
            .maybeSingle();

        if (readError) throw readError;
        if (!recommendation) return NextResponse.json({ error: "Recommendation not found." }, { status: 404 });
        if (role !== "admin" && recommendation.client_id !== auth.user.id) {
            return NextResponse.json({ error: "Recommendation not found." }, { status: 404 });
        }

        if (action === "open_preview") {
            return NextResponse.json({ url: `/dashboard/preview-studio?productId=${recommendation.product_id}` });
        }
        if (action === "generate_content") {
            return NextResponse.json({ url: `/dashboard/social-content?productId=${recommendation.product_id}` });
        }

        const status = action === "dismiss" ? "dismissed" : "completed";
        const { data, error } = await supabase
            .from("inventory_recommendations")
            .update({ status, updated_at: new Date().toISOString() })
            .eq("id", params.id)
            .select("*")
            .single();

        if (error) throw error;
        return NextResponse.json({ recommendation: data });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not update this recommendation." }, { status: 500 });
    }
}
