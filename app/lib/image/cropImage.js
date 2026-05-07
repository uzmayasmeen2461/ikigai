export function createCenteredCrop(width, height) {
    const cropWidth = Math.max(120, Math.round(width * 0.42));
    const cropHeight = Math.max(120, Math.round(height * 0.42));

    return {
        unit: "px",
        width: cropWidth,
        height: cropHeight,
        x: Math.max(0, Math.round((width - cropWidth) / 2)),
        y: Math.max(0, Math.round((height - cropHeight) / 2)),
    };
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function colorDistance(left, right) {
    return Math.sqrt(
        (left.r - right.r) ** 2 +
            (left.g - right.g) ** 2 +
            (left.b - right.b) ** 2
    );
}

function saturation(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (max === 0) return 0;
    return ((max - min) / max) * 255;
}

function averageBorderColor(imageData, width, height) {
    const data = imageData.data;
    const border = Math.max(4, Math.round(Math.min(width, height) * 0.06));
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const isBorder = x < border || y < border || x >= width - border || y >= height - border;
            if (!isBorder) continue;

            const index = (y * width + x) * 4;
            r += data[index];
            g += data[index + 1];
            b += data[index + 2];
            count += 1;
        }
    }

    return {
        r: r / Math.max(1, count),
        g: g / Math.max(1, count),
        b: b / Math.max(1, count),
    };
}

function buildSaliencyMask(imageData, width, height) {
    const data = imageData.data;
    const borderColor = averageBorderColor(imageData, width, height);
    const scores = new Array(width * height).fill(0);
    let total = 0;
    let totalSquared = 0;

    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const rightIndex = (y * width + x + 1) * 4;
            const bottomIndex = ((y + 1) * width + x) * 4;
            const edge =
                Math.abs(r - data[rightIndex]) +
                Math.abs(g - data[rightIndex + 1]) +
                Math.abs(b - data[rightIndex + 2]) +
                Math.abs(r - data[bottomIndex]) +
                Math.abs(g - data[bottomIndex + 1]) +
                Math.abs(b - data[bottomIndex + 2]);
            const score =
                colorDistance({ r, g, b }, borderColor) +
                saturation(r, g, b) * 0.32 +
                edge * 0.08;

            scores[y * width + x] = score;
            total += score;
            totalSquared += score * score;
        }
    }

    const pixels = Math.max(1, (width - 2) * (height - 2));
    const mean = total / pixels;
    const variance = Math.max(0, totalSquared / pixels - mean * mean);
    const threshold = Math.max(34, mean + Math.sqrt(variance) * 0.75);

    return scores.map((score) => score >= threshold);
}

function findLargestComponent(mask, width, height) {
    const visited = new Uint8Array(width * height);
    const queue = [];
    let best = null;

    for (let start = 0; start < mask.length; start += 1) {
        if (!mask[start] || visited[start]) continue;

        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        let area = 0;

        queue.length = 0;
        queue.push(start);
        visited[start] = 1;

        for (let pointer = 0; pointer < queue.length; pointer += 1) {
            const current = queue[pointer];
            const x = current % width;
            const y = Math.floor(current / width);

            area += 1;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);

            const neighbors = [current - 1, current + 1, current - width, current + width];

            for (const next of neighbors) {
                if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;

                const nextX = next % width;
                if (Math.abs(nextX - x) > 1) continue;

                visited[next] = 1;
                queue.push(next);
            }
        }

        const componentWidth = maxX - minX + 1;
        const componentHeight = maxY - minY + 1;
        const largeEnough = area > width * height * 0.006 && componentWidth > 8 && componentHeight > 8;

        if (largeEnough && (!best || area > best.area)) {
            best = { minX, minY, maxX, maxY, area };
        }
    }

    return best;
}

export function detectProductCrop(imageElement) {
    if (!imageElement?.naturalWidth || !imageElement?.naturalHeight) {
        return null;
    }

    const maxSide = 420;
    const scale = Math.min(1, maxSide / Math.max(imageElement.naturalWidth, imageElement.naturalHeight));
    const width = Math.max(1, Math.round(imageElement.naturalWidth * scale));
    const height = Math.max(1, Math.round(imageElement.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) return null;

    context.drawImage(imageElement, 0, 0, width, height);

    const imageData = context.getImageData(0, 0, width, height);
    const mask = buildSaliencyMask(imageData, width, height);
    const component = findLargestComponent(mask, width, height);

    if (!component) {
        return null;
    }

    const paddingX = Math.max(14, Math.round((component.maxX - component.minX + 1) * 0.18));
    const paddingY = Math.max(14, Math.round((component.maxY - component.minY + 1) * 0.18));
    const naturalX = clamp((component.minX - paddingX) / scale, 0, imageElement.naturalWidth);
    const naturalY = clamp((component.minY - paddingY) / scale, 0, imageElement.naturalHeight);
    const naturalRight = clamp((component.maxX + paddingX) / scale, 0, imageElement.naturalWidth);
    const naturalBottom = clamp((component.maxY + paddingY) / scale, 0, imageElement.naturalHeight);
    const displayScaleX = imageElement.clientWidth / imageElement.naturalWidth;
    const displayScaleY = imageElement.clientHeight / imageElement.naturalHeight;
    const crop = {
        unit: "px",
        x: Math.round(naturalX * displayScaleX),
        y: Math.round(naturalY * displayScaleY),
        width: Math.round((naturalRight - naturalX) * displayScaleX),
        height: Math.round((naturalBottom - naturalY) * displayScaleY),
    };

    if (crop.width < 32 || crop.height < 32) {
        return null;
    }

    return crop;
}

export async function getCroppedImg(imageElement, completedCrop, fileName = "catalog-crop.png") {
    if (!imageElement || !completedCrop?.width || !completedCrop?.height) {
        throw new Error("A valid crop selection is required.");
    }

    const scaleX = imageElement.naturalWidth / imageElement.clientWidth;
    const scaleY = imageElement.naturalHeight / imageElement.clientHeight;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(completedCrop.width * scaleX));
    canvas.height = Math.max(1, Math.round(completedCrop.height * scaleY));

    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Could not create crop canvas.");
    }

    context.drawImage(
        imageElement,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
        throw new Error("Could not create cropped image.");
    }

    const previewUrl = await blobToDataUrl(blob);
    const file = new File([blob], fileName, { type: "image/png" });

    return { blob, file, previewUrl };
}

export async function getCroppedImgFromNaturalBox(imageElement, box, fileName = "catalog-crop.png") {
    if (!imageElement || !box?.width || !box?.height) {
        throw new Error("A valid detection box is required.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(box.width));
    canvas.height = Math.max(1, Math.round(box.height));

    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Could not create crop canvas.");
    }

    context.drawImage(
        imageElement,
        Math.max(0, Math.round(box.x)),
        Math.max(0, Math.round(box.y)),
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
        throw new Error("Could not create cropped image.");
    }

    const previewUrl = await blobToDataUrl(blob);
    const file = new File([blob], fileName, { type: "image/png" });

    return { blob, file, previewUrl };
}

function loadImage(imageSrc) {
    return new Promise((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageSrc;
    });
}

function getDisplayDimensions(imageElement, fallbackImage) {
    const renderedWidth = imageElement?.width || fallbackImage.width;
    const renderedHeight = imageElement?.height || fallbackImage.height;

    return {
        renderedWidth,
        renderedHeight,
    };
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export async function createCroppedImageFile(imageSrc, crop, fileName = "catalog-crop.png", imageElement = null) {
    if (imageElement) {
        return getCroppedImg(imageElement, crop, fileName);
    }

    const image = await loadImage(imageSrc);

    const { renderedWidth, renderedHeight } = getDisplayDimensions(imageElement, image);
    const scaleX = image.naturalWidth / renderedWidth;
    const scaleY = image.naturalHeight / renderedHeight;
    const outputWidth = Math.max(1, Math.round(crop.width * scaleX));
    const outputHeight = Math.max(1, Math.round(crop.height * scaleY));

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");

    context.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

    if (!blob) {
        throw new Error("Could not create cropped image.");
    }

    const previewUrl = await blobToDataUrl(blob);
    const file = new File([blob], fileName, { type: "image/png" });

    return { blob, file, previewUrl };
}
