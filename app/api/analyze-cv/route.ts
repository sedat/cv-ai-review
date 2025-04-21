import { NextRequest, NextResponse } from "next/server";
import { analyzeCvWithJobDescription } from "@/lib/analyze-cv";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

// Ensure the tmp directory exists
const ensureTmpDir = async () => {
    const tempDir = path.join(process.cwd(), "tmp");
    try {
        await fs.promises.access(tempDir);
    } catch (error) {
        // Directory doesn't exist, create it
        await mkdir(tempDir, { recursive: true });
    }
    return tempDir;
};

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const pdfFile = formData.get("cv") as File;
        const jobDescription = formData.get("jobDescription") as string;

        if (!pdfFile || !jobDescription) {
            return NextResponse.json(
                { error: "CV file and job description are required" },
                { status: 400 }
            );
        }

        // Convert File to Buffer for processing
        const buffer = Buffer.from(await pdfFile.arrayBuffer());

        try {
            // Ensure the tmp directory exists
            const tempDir = await ensureTmpDir();
            const tempFilePath = path.join(tempDir, `${uuidv4()}.pdf`);

            // Write the file
            await writeFile(tempFilePath, buffer);

            // Create a URL for the PDF that can be accessed
            const pdfUrl = `/api/temp-files/${path.basename(tempFilePath)}`;

            // Analyze CV with job description
            const analysisResult = await analyzeCvWithJobDescription(
                pdfUrl,
                jobDescription
            );

            return NextResponse.json(analysisResult);
        } catch (error) {
            console.error("Error processing PDF:", error);
            throw error;
        }
    } catch (error) {
        console.error("Error in CV analysis API:", error);
        return NextResponse.json(
            { error: "Failed to process CV" },
            { status: 500 }
        );
    }
}
