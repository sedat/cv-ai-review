"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploader } from "@/components/file-uploader";
import { AnalysisResults } from "@/components/analysis-results";
import { analyzeCvWithJobDescription } from "@/lib/analyze-cv";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Don't import PDF.js at the module level - we'll dynamically import it when needed
export type AnalysisResult = {
    summary: string;
    keywordMatch: {
        score: number;
        matchedKeywords: string[];
        missingKeywords: string[];
        importanceWeights?: {
            keyword: string;
            importance: number;
        }[];
    };
    suggestions: {
        section: string;
        content: string;
        priority?: number;
    }[];
    strengths: string[];
    improvements: string[];
    sections?: {
        title: string;
        suggestions: {
            originalText: string;
            suggestedText: string;
            priority?: number;
        }[];
        improvements?: {
            originalText: string;
            suggestedText: string;
            priority?: number;
        }[];
    }[];
};

export function CvOptimizer() {
    const [jobDescription, setJobDescription] = useState("");
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<AnalysisResult | null>(null);
    const [activeTab, setActiveTab] = useState("upload");
    const [fileError, setFileError] = useState<string | null>(null);
    const [isConvertingPdf, setIsConvertingPdf] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const convertPdfToImage = async (file: File): Promise<string> => {
        setIsConvertingPdf(true);

        try {
            // Create form data to send the file
            const formData = new FormData();
            formData.append("file", file);

            // Send the PDF to our API route for image conversion
            const response = await fetch("/api/pdf-to-image", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.error || "Failed to convert PDF to image"
                );
            }

            const data = await response.json();
            return data.imageUrl;
        } catch (error) {
            console.error("Error converting PDF to image:", error);
            throw error;
        } finally {
            setIsConvertingPdf(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        setCvFile(file);
        setFileError(null);
        setPdfUrl(null); // Clear any previous PDF URL

        try {
            if (file.type === "application/pdf") {
                // Convert PDF for analysis
                const url = await convertPdfToImage(file);
                setPdfUrl(url);
            } else {
                throw new Error(
                    "Unsupported file type. Please upload a PDF file."
                );
            }
        } catch (error) {
            console.error("Error processing file:", error);
            setFileError(
                error instanceof Error
                    ? error.message
                    : "Failed to process file"
            );
        }
    };

    const handleAnalyze = async () => {
        if (!jobDescription) {
            setFileError("Please enter a job description");
            return;
        }

        if (!cvFile) {
            setFileError("Please upload a CV");
            return;
        }

        // For PDF files, we need the PDF URL
        if (cvFile?.type === "application/pdf" && !pdfUrl) {
            setFileError("Please wait for PDF processing to complete");
            return;
        }

        setIsAnalyzing(true);
        try {
            // Use the PDF for analysis
            if (pdfUrl) {
                const analysisResults = await analyzeCvWithJobDescription(
                    pdfUrl,
                    jobDescription
                );
                setResults(analysisResults);
                setActiveTab("results");
            } else {
                setFileError("PDF processing is required for analysis");
                throw new Error("PDF required for analysis");
            }
        } catch (error) {
            console.error("Error analyzing CV:", error);
            setFileError("Failed to analyze CV. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
            <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="upload">
                            Upload & Describe
                        </TabsTrigger>
                        <TabsTrigger value="results" disabled={!results}>
                            Results
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-200">
                                    Upload Your CV
                                </h2>
                                <FileUploader
                                    onFileUpload={handleFileUpload}
                                    acceptedFileTypes=".pdf"
                                />
                                {cvFile && !fileError && (
                                    <div className="mt-2">
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Uploaded: {cvFile.name}
                                        </p>
                                        {isConvertingPdf && (
                                            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center mt-1">
                                                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                                Processing PDF...
                                            </p>
                                        )}
                                        {pdfUrl && (
                                            <div className="mt-2">
                                                <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                                                    ✓ PDF processed successfully
                                                </p>
                                                <div
                                                    className="border rounded overflow-hidden"
                                                    style={{ height: "200px" }}
                                                >
                                                    <iframe
                                                        src={pdfUrl}
                                                        className="w-full h-full"
                                                        title="CV Preview"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {fileError && (
                                    <Alert
                                        variant="destructive"
                                        className="mt-2"
                                    >
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>
                                            {fileError}
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-200">
                                    Job Description
                                </h2>
                                <Textarea
                                    placeholder="Paste the job description here..."
                                    className="min-h-[200px] resize-none"
                                    value={jobDescription}
                                    onChange={(e) =>
                                        setJobDescription(e.target.value)
                                    }
                                />
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleAnalyze}
                                disabled={
                                    !jobDescription ||
                                    !cvFile ||
                                    isAnalyzing ||
                                    isConvertingPdf ||
                                    !pdfUrl ||
                                    !!fileError
                                }
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    "Analyze and Optimize CV"
                                )}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="results">
                        {results && (
                            <AnalysisResults
                                results={results}
                                pdfFile={cvFile}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
