import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Convert File to Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Convert PDF to image (either data URL or file path)
        const imageUrl = await convertPdfToImage(buffer);

        return NextResponse.json({ imageUrl });
    } catch (error) {
        console.error("Error converting PDF to image:", error);
        return NextResponse.json(
            { error: "Failed to convert PDF to image" },
            { status: 500 }
        );
    }
}

/**
 * Converts the first page of a PDF to an image and returns the image URL
 * This approach uses pdf-lib to create a data URL for the first page
 */
async function convertPdfToImage(pdfBuffer: Buffer): Promise<string> {
    try {
        // Load the PDF document
        const pdfDoc = await PDFDocument.load(pdfBuffer);

        if (pdfDoc.getPageCount() === 0) {
            throw new Error("PDF has no pages");
        }

        // Get the first page
        const firstPage = pdfDoc.getPages()[0];

        // Create a new document with just the first page
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [0]);
        singlePagePdf.addPage(copiedPage);

        // Save as base64-encoded data URL
        const pdfDataUri = await singlePagePdf.saveAsBase64({ dataUri: true });

        // We have two options:
        // 1. Return the data URL directly (works for smaller PDFs)
        // 2. Save the PDF to a file and return the file URL (better for larger PDFs)

        // Option 2: Save to file and return URL
        const filename = `${randomUUID()}.pdf`;
        const publicDir = join(process.cwd(), "public", "temp");

        // Ensure directory exists
        if (!existsSync(publicDir)) {
            await mkdir(publicDir, { recursive: true });
        }

        const filePath = join(publicDir, filename);
        const pdfBytes = await singlePagePdf.save();
        await writeFile(filePath, pdfBytes);

        // Return the URL to the PDF - client will render it
        return `/temp/${filename}`;
    } catch (error) {
        console.error("PDF conversion error:", error);
        throw new Error("Failed to convert PDF to image");
    }
}
