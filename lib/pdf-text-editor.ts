import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";

// Types for text extraction and manipulation
export interface TextItem {
    text: string;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
        fontSize?: number;
        fontName?: string;
    };
    pageIndex: number;
}

export interface TextBlock {
    items: TextItem[];
    text: string;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    pageIndex: number;
    isModified: boolean;
    originalText?: string;
}

export interface PdfTextMap {
    blocks: TextBlock[];
    pages: {
        width: number;
        height: number;
    }[];
}

/**
 * Extract text with position data from a PDF document using PDF.js
 */
export async function extractTextWithPositions(
    pdfArrayBuffer: ArrayBuffer,
    pdfjs: any
): Promise<PdfTextMap> {
    // Create a proper copy of the ArrayBuffer to avoid detached buffer issues
    const uint8Array = new Uint8Array(pdfArrayBuffer);
    const freshBuffer = uint8Array.slice().buffer;

    try {
        // Load the PDF document using PDF.js
        const loadingTask = pdfjs.getDocument(uint8Array);
        const pdfDoc = await loadingTask.promise;

        const numPages = pdfDoc.numPages;
        const allTextItems: TextItem[] = [];
        const pageInfo: { width: number; height: number }[] = [];

        // Process each page
        for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
            const page = await pdfDoc.getPage(pageIndex + 1); // PDF.js uses 1-based indexing
            const viewport = page.getViewport({ scale: 1.0 });

            pageInfo.push({
                width: viewport.width,
                height: viewport.height,
            });

            // Extract text content with positions
            const textContent = await page.getTextContent();

            // Convert text items to our format
            const pageTextItems = textContent.items.map((item: any) => {
                // PDF.js provides transform matrix [a, b, c, d, e, f]
                // where (e, f) is the position and we can calculate width
                const transform = item.transform;

                // Calculate height based on font size and scaling
                const fontSize =
                    item.height || item.transform[3] * (item.fontSize || 10);
                const height = fontSize * 1.2; // Approximate line height

                return {
                    text: item.str,
                    position: {
                        x: transform[4],
                        y: transform[5],
                        width: item.width || item.str.length * fontSize * 0.6, // Approximate width if not provided
                        height: height,
                        fontSize: fontSize,
                        fontName: item.fontName,
                    },
                    pageIndex,
                };
            });

            allTextItems.push(...pageTextItems);
        }

        // Group text items into logical blocks
        const blocks = groupTextIntoBlocks(allTextItems);

        return {
            blocks,
            pages: pageInfo,
        };
    } catch (error) {
        console.error("Error extracting text from PDF:", error);
        throw error;
    }
}

/**
 * Group text items into logical blocks based on proximity and alignment
 */
export const groupTextIntoBlocks = (textItems: TextItem[]): TextBlock[] => {
    // Sort items by page, then by y-position (top to bottom), then by x-position (left to right)
    const sortedItems = [...textItems].sort((a, b) => {
        if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;

        // Use a threshold for y-position to group items on the same line
        const yThreshold = Math.max(a.position.height, b.position.height) * 0.5;
        if (Math.abs(a.position.y - b.position.y) > yThreshold) {
            return b.position.y - a.position.y; // Reverse order for y (top to bottom)
        }

        return a.position.x - b.position.x;
    });

    const blocks: TextBlock[] = [];
    let currentBlock: TextItem[] = [];
    let currentPageIndex = -1;
    let lastY = -1;
    let lastRight = -1;

    // Process sorted items to form blocks
    for (const item of sortedItems) {
        const { x, y, width, height } = item.position;
        const right = x + width;

        // Start a new block if:
        // 1. This is the first item
        // 2. We've moved to a new page
        // 3. We've moved to a new line (y position changed significantly)
        // 4. There's a significant horizontal gap
        const isNewPage = item.pageIndex !== currentPageIndex;
        const isNewLine = Math.abs(y - lastY) > height * 0.5;
        const isGap = x > lastRight + width * 0.5;

        if (currentBlock.length > 0 && (isNewPage || isNewLine || isGap)) {
            // Finalize the current block
            blocks.push(createBlockFromItems(currentBlock));
            currentBlock = [];
        }

        currentBlock.push(item);
        currentPageIndex = item.pageIndex;
        lastY = y;
        lastRight = right;
    }

    // Add the last block if there are items
    if (currentBlock.length > 0) {
        blocks.push(createBlockFromItems(currentBlock));
    }

    return blocks;
};

/**
 * Create a TextBlock from an array of TextItems
 */
const createBlockFromItems = (items: TextItem[]): TextBlock => {
    if (items.length === 0) {
        throw new Error("Cannot create block from empty items array");
    }

    // Calculate the bounding box for all items
    const pageIndex = items[0].pageIndex;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const item of items) {
        const { x, y, width, height } = item.position;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
    }

    // Combine text from all items
    const text = items.map((item) => item.text).join(" ");

    return {
        items,
        text,
        position: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        },
        pageIndex,
        isModified: false,
    };
};

/**
 * Find the text block that contains the specified text at the given position
 */
export const findTextBlockToReplace = (
    textMap: PdfTextMap,
    originalText: string,
    position: { x: number; y: number; width: number; height: number },
    pageIndex: number
): TextBlock | null => {
    // Filter blocks by page
    const pageBlocks = textMap.blocks.filter(
        (block) => block.pageIndex === pageIndex
    );

    // Find blocks that overlap with the given position
    const overlappingBlocks = pageBlocks.filter((block) => {
        const { x, y, width, height } = block.position;

        // Check if the blocks overlap
        const overlapX = Math.max(
            0,
            Math.min(x + width, position.x + position.width) -
                Math.max(x, position.x)
        );
        const overlapY = Math.max(
            0,
            Math.min(y + height, position.y + position.height) -
                Math.max(y, position.y)
        );

        return overlapX > 0 && overlapY > 0;
    });

    if (overlappingBlocks.length === 0) {
        return null;
    }

    // Find the block that contains the original text
    // We use a fuzzy match to account for potential differences in extracted text
    for (const block of overlappingBlocks) {
        if (fuzzyTextMatch(block.text, originalText)) {
            return block;
        }
    }

    // If no exact match, return the block with the highest overlap
    return overlappingBlocks[0];
};

/**
 * Perform a fuzzy match between two text strings
 */
const fuzzyTextMatch = (text1: string, text2: string): boolean => {
    // Normalize both texts (remove extra spaces, convert to lowercase)
    const normalize = (text: string) =>
        text.trim().replace(/\s+/g, " ").toLowerCase();

    const normalizedText1 = normalize(text1);
    const normalizedText2 = normalize(text2);

    // Check if one contains the other
    return (
        normalizedText1.includes(normalizedText2) ||
        normalizedText2.includes(normalizedText1) ||
        // Calculate similarity (simple version)
        calculateSimilarity(normalizedText1, normalizedText2) > 0.7
    );
};

/**
 * Calculate similarity between two strings (0-1)
 */
const calculateSimilarity = (s1: string, s2: string): number => {
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    // Simple Jaccard similarity of words
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
};

/**
 * Replace text in a block and update the text map
 */
export const replaceTextInBlock = (
    textMap: PdfTextMap,
    blockToReplace: TextBlock,
    newText: string
): PdfTextMap => {
    // Create a copy of the text map
    const updatedMap: PdfTextMap = {
        blocks: [...textMap.blocks],
        pages: [...textMap.pages],
    };

    // Find the index of the block to replace
    const blockIndex = updatedMap.blocks.findIndex(
        (block) =>
            block.pageIndex === blockToReplace.pageIndex &&
            block.position.x === blockToReplace.position.x &&
            block.position.y === blockToReplace.position.y
    );

    if (blockIndex === -1) {
        console.error("Block not found in text map");
        return textMap;
    }

    // Create an updated block
    const updatedBlock: TextBlock = {
        ...blockToReplace,
        text: newText,
        originalText: blockToReplace.text,
        isModified: true,
    };

    // Replace the block in the map
    updatedMap.blocks[blockIndex] = updatedBlock;

    return updatedMap;
};

/**
 * Regenerate a PDF with modified text blocks
 */
export const regeneratePdfWithModifiedText = async (
    originalPdfArrayBuffer: ArrayBuffer,
    textMap: PdfTextMap
): Promise<Uint8Array> => {
    try {
        // Create a copy of the ArrayBuffer to avoid detached buffer issues
        // This creates a proper copy of the buffer
        const bufferCopy = new Uint8Array(originalPdfArrayBuffer).buffer;

        // Load the original PDF
        const pdfDoc = await PDFDocument.load(bufferCopy);
        const pages = pdfDoc.getPages();

        // Get the default font
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Process each page
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            const page = pages[pageIndex];
            const { width, height } = page.getSize();

            // Find modified blocks for this page
            const modifiedBlocks = textMap.blocks.filter(
                (block) => block.pageIndex === pageIndex && block.isModified
            );

            // Apply each modified block
            for (const block of modifiedBlocks) {
                // Cover the original text with a white rectangle
                page.drawRectangle({
                    x: block.position.x,
                    y: height - block.position.y - block.position.height, // Convert to PDF coordinates
                    width: block.position.width,
                    height: block.position.height,
                    color: rgb(1, 1, 1), // White
                    opacity: 1.0,
                });

                // Draw the new text
                drawTextWithWrapping(
                    page,
                    block.text,
                    block.position.x,
                    height - block.position.y - block.position.height, // Convert to PDF coordinates
                    block.position.width,
                    helveticaFont,
                    10 // Default font size
                );
            }
        }

        // Save the modified PDF
        return await pdfDoc.save();
    } catch (error) {
        console.error("Error regenerating PDF:", error);
        throw error;
    }
};

/**
 * Draw text with word wrapping
 */
const drawTextWithWrapping = (
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    font: PDFFont,
    fontSize: number
): void => {
    const lineHeight = fontSize * 1.2;
    const paragraphs = text.split("\n");
    let yOffset = 0;

    for (const paragraph of paragraphs) {
        if (!paragraph.trim()) {
            yOffset += lineHeight;
            continue;
        }

        const words = paragraph.split(" ");
        let line = "";

        for (const word of words) {
            const testLine = line + (line ? " " : "") + word;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);

            if (testWidth > maxWidth && line !== "") {
                // Draw the current line
                page.drawText(line, {
                    x,
                    y: y + yOffset,
                    size: fontSize,
                    font,
                });

                line = word;
                yOffset += lineHeight;
            } else {
                line = testLine;
            }
        }

        // Draw the last line of the paragraph
        if (line) {
            page.drawText(line, {
                x,
                y: y + yOffset,
                size: fontSize,
                font,
            });
            yOffset += lineHeight * 1.5; // Extra space after paragraph
        }
    }
};
