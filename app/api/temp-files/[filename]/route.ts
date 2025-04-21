import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
    request: NextRequest,
    { params }: { params: { filename: string } }
) {
    try {
        const filename = params.filename;

        // Validate filename to prevent directory traversal
        if (
            !filename ||
            filename.includes("..") ||
            !filename.endsWith(".pdf")
        ) {
            return NextResponse.json(
                { error: "Invalid filename" },
                { status: 400 }
            );
        }

        // Get the file path
        const filePath = path.join(process.cwd(), "tmp", filename);

        try {
            // Read the file
            const fileBuffer = await readFile(filePath);

            // Return the file with appropriate headers
            return new NextResponse(fileBuffer, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `inline; filename="${filename}"`,
                },
            });
        } catch (error) {
            console.error("Error reading file:", error);
            return NextResponse.json(
                { error: "File not found" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error("Error serving temporary file:", error);
        return NextResponse.json(
            { error: "Failed to serve file" },
            { status: 500 }
        );
    }
}
