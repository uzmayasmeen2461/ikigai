function boxId(index) {
    return `heuristic-${String(index + 1).padStart(3, "0")}`;
}

export async function detectWithHeuristic({ width, height }) {
    if (!width || !height) {
        throw new Error("Image dimensions are required for heuristic detection.");
    }

    const aspectRatio = width / height;
    const columns = aspectRatio >= 1.45 ? 5 : aspectRatio >= 0.95 ? 4 : 3;
    const rows = aspectRatio >= 1.45 ? 3 : aspectRatio >= 0.95 ? 4 : 5;
    const marginX = Math.round(width * 0.035);
    const marginY = Math.round(height * 0.035);
    const gapX = Math.round(width * 0.012);
    const gapY = Math.round(height * 0.012);
    const usableWidth = width - marginX * 2 - gapX * (columns - 1);
    const usableHeight = height - marginY * 2 - gapY * (rows - 1);
    const cellWidth = Math.floor(usableWidth / columns);
    const cellHeight = Math.floor(usableHeight / rows);
    const minWidth = Math.max(80, width * 0.08);
    const minHeight = Math.max(80, height * 0.08);
    const boxes = [];

    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            const x = marginX + column * (cellWidth + gapX);
            const y = marginY + row * (cellHeight + gapY);
            const cropWidth = Math.min(cellWidth, width - x - marginX);
            const cropHeight = Math.min(cellHeight, height - y - marginY);

            if (cropWidth < minWidth || cropHeight < minHeight) continue;

            boxes.push({
                id: boxId(boxes.length),
                x,
                y,
                width: cropWidth,
                height: cropHeight,
                label: "product",
                confidence: 0.3,
            });
        }
    }

    return { boxes };
}
