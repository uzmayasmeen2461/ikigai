import { detectWithHeuristic } from "./providers/heuristicDetector";
import { detectWithRoboflow } from "./providers/roboflowDetector";

function readPngDimensions(buffer) {
    if (buffer.toString("ascii", 1, 4) !== "PNG") return null;

    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    };
}

function readJpegDimensions(buffer) {
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

    let offset = 2;
    while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) return null;

        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

        if (isStartOfFrame) {
            return {
                height: buffer.readUInt16BE(offset + 5),
                width: buffer.readUInt16BE(offset + 7),
            };
        }

        offset += 2 + length;
    }

    return null;
}

function readWebpDimensions(buffer) {
    if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
        return null;
    }

    const chunk = buffer.toString("ascii", 12, 16);

    if (chunk === "VP8X") {
        return {
            width: 1 + buffer.readUIntLE(24, 3),
            height: 1 + buffer.readUIntLE(27, 3),
        };
    }

    return null;
}

export async function getImageDimensions(file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dimensions =
        readPngDimensions(buffer) ||
        readJpegDimensions(buffer) ||
        readWebpDimensions(buffer);

    if (!dimensions?.width || !dimensions?.height) {
        throw new Error("Could not read image dimensions. Please upload a PNG, JPEG, or WebP image.");
    }

    return dimensions;
}

function clampBox(box, width, height) {
    const x = Math.max(0, Math.min(width - 1, Math.round(Number(box.x || 0))));
    const y = Math.max(0, Math.min(height - 1, Math.round(Number(box.y || 0))));
    const boxWidth = Math.max(1, Math.min(width - x, Math.round(Number(box.width || 0))));
    const boxHeight = Math.max(1, Math.min(height - y, Math.round(Number(box.height || 0))));

    return {
        id: String(box.id || crypto.randomUUID()),
        x,
        y,
        width: boxWidth,
        height: boxHeight,
        label: String(box.label || "product"),
        confidence: Math.max(0, Math.min(1, Number(box.confidence || 0))),
    };
}

export async function detectProducts({ file, provider = "heuristic" }) {
    const dimensions = await getImageDimensions(file);
    let result;

    if (provider === "heuristic") {
        result = await detectWithHeuristic(dimensions);
    } else if (provider === "roboflow") {
        result = await detectWithRoboflow({ file, ...dimensions });
    } else {
        throw new Error("Unsupported product detection provider.");
    }

    // Future providers can plug in here:
    // - YOLO/TensorFlow.js browser model for fully local product boxes
    // - Roboflow custom product detector trained on shelf/product data
    // - OpenAI Vision structured detection for semantic product hints
    // - Segment Anything / SAM-style segmentation for tighter masks
    return {
        provider,
        image: dimensions,
        boxes: (result.boxes || []).map((box) => clampBox(box, dimensions.width, dimensions.height)),
    };
}
