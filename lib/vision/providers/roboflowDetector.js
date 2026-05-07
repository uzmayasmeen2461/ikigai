function roboflowEndpoint() {
    if (process.env.ROBOFLOW_MODEL_URL) {
        return process.env.ROBOFLOW_MODEL_URL;
    }

    if (process.env.ROBOFLOW_MODEL_ID) {
        return `https://detect.roboflow.com/${process.env.ROBOFLOW_MODEL_ID}`;
    }

    return "";
}

function endpointWithApiKey(endpoint) {
    const url = new URL(endpoint);
    url.searchParams.set("api_key", process.env.ROBOFLOW_API_KEY);
    return url.toString();
}

function normalizePrediction(prediction, index) {
    const width = Number(prediction.width || 0);
    const height = Number(prediction.height || 0);
    const centerX = Number(prediction.x || 0);
    const centerY = Number(prediction.y || 0);

    return {
        id: prediction.detection_id || prediction.id || `roboflow-${String(index + 1).padStart(3, "0")}`,
        x: Math.max(0, Math.round(centerX - width / 2)),
        y: Math.max(0, Math.round(centerY - height / 2)),
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
        label: prediction.class || prediction.label || "product",
        confidence: Number(prediction.confidence || 0),
    };
}

export async function detectWithRoboflow({ file }) {
    if (!process.env.ROBOFLOW_API_KEY || !roboflowEndpoint()) {
        throw new Error("Roboflow is not configured");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const response = await fetch(endpointWithApiKey(roboflowEndpoint()), {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: buffer.toString("base64"),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Roboflow detection failed");
    }

    const payload = await response.json();
    const predictions = Array.isArray(payload.predictions) ? payload.predictions : [];

    return {
        boxes: predictions.map(normalizePrediction).filter((box) => box.width > 1 && box.height > 1),
    };
}
