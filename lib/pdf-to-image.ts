import { PDFDocument } from "pdf-lib";

/**
 * Converts the first page of a PDF to a data URL image
 * @param pdfBuffer - The PDF file as a Buffer
 * @returns A Promise that resolves to a data URL of the image
 */
export async function convertPdfToImage(pdfBuffer: Buffer): Promise<string> {
    try {
        // Load the PDF
        const pdfDoc = await PDFDocument.load(pdfBuffer);

        // Get the first page
        const page = pdfDoc.getPages()[0];
        const { width, height } = page.getSize();

        // Create a scaled version for better image quality with Gemini
        const scale = 2; // Adjust this for quality vs. size trade-off
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;

        // Get page as SVG
        const svgDoc = await pdfDoc.saveAsBase64({ dataUri: true });

        // Create a canvas in the browser
        const canvas = document.createElement("canvas");
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            throw new Error("Failed to get canvas context");
        }

        // Create an image from the PDF
        const img = new Image();

        // Return a promise that resolves when the image is loaded
        return new Promise((resolve, reject) => {
            img.onload = () => {
                // Fill with white background
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, scaledWidth, scaledHeight);

                // Draw the PDF onto the canvas
                ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

                // Convert canvas to data URL (PNG format)
                const dataUrl = canvas.toDataURL("image/png");
                resolve(dataUrl);
            };

            img.onerror = () => {
                reject(new Error("Failed to load PDF as image"));
            };

            // Set the source to the PDF data URI
            img.src = svgDoc;
        });
    } catch (error) {
        console.error("Error converting PDF to image:", error);
        throw error;
    }
}

/**
 * Server-side version of PDF to image conversion
 * @param pdfBuffer - The PDF file as a Buffer
 * @returns A Promise that resolves to a data URL of the image
 */
export async function convertPdfToImageNode(
    pdfBuffer: Buffer
): Promise<string> {
    try {
        // This function would use Node.js libraries like sharp or canvas
        // For now we'll just use a placeholder as this requires server-side implementation
        throw new Error("Server-side PDF to image conversion not implemented");

        // Example implementation would look like:
        // const sharp = require('sharp');
        // const pdfPage = await convertPdfPageToPng(pdfBuffer, 0); // First page
        // const base64 = pdfPage.toString('base64');
        // return `data:image/png;base64,${base64}`;
    } catch (error) {
        console.error("Error converting PDF to image on server:", error);
        throw error;
    }
}
