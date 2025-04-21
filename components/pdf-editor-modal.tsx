"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Download, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type AnalysisResult } from "@/components/cv-optimizer";
import {
    extractTextWithPositions,
    findTextBlockToReplace,
    replaceTextInBlock,
    regeneratePdfWithModifiedText,
    type PdfTextMap,
    type TextBlock,
} from "@/lib/pdf-text-editor";

interface PdfSuggestion {
    id: string;
    originalText: string;
    suggestedText: string;
    section: string;
    page: number;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    applied: boolean;
    priority?: number;
    type: "suggestion" | "improvement";
    replaceInPlace: boolean;
}

interface PdfEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfFile: File | null;
    analysisResults: AnalysisResult | null;
}

export function PdfEditorModal({
    isOpen,
    onClose,
    pdfFile: initialPdfFile,
    analysisResults,
}: PdfEditorModalProps) {
    // PDF state
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [pdfFile, setPdfFile] = useState<File | null>(initialPdfFile);

    // PDF.js state
    const [pdfjs, setPdfjs] = useState<any>(null);

    // Canvas and rendering state
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderTaskRef = useRef<any>(null);
    const pdfInstanceRef = useRef<any>(null);

    // Text and suggestions state
    const [suggestions, setSuggestions] = useState<PdfSuggestion[]>([]);
    const [pdfTextMap, setPdfTextMap] = useState<PdfTextMap | null>(null);
    const [modifiedTextMap, setModifiedTextMap] = useState<PdfTextMap | null>(
        null
    );
    const [currentSuggestionId, setCurrentSuggestionId] = useState<
        string | null
    >(null);
    const [modifiedPdfUrl, setModifiedPdfUrl] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<boolean>(true);

    // Load PDF.js dynamically
    useEffect(() => {
        const loadPdfJs = async () => {
            if (typeof window !== "undefined" && !pdfjs) {
                try {
                    console.log("Loading PDF.js dynamically");
                    const pdfJsModule = await import("pdfjs-dist");

                    // Set worker source path
                    const workerSrc = `/pdf-worker/pdf.worker.min.js`;
                    pdfJsModule.GlobalWorkerOptions.workerSrc = workerSrc;

                    console.log(
                        "PDF.js loaded successfully, version:",
                        pdfJsModule.version
                    );
                    setPdfjs(pdfJsModule);
                } catch (error) {
                    console.error("Error loading PDF.js:", error);
                }
            }
        };

        loadPdfJs();

        // Cleanup function
        return () => {
            // Clean up any rendering tasks
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch (error) {
                    console.log(
                        "Error cancelling render task during cleanup:",
                        error
                    );
                }
                renderTaskRef.current = null;
            }

            // Clean up PDF document
            if (pdfInstanceRef.current) {
                try {
                    pdfInstanceRef.current.destroy();
                } catch (error) {
                    console.log(
                        "Error destroying previous PDF instance:",
                        error
                    );
                }
                pdfInstanceRef.current = null;
            }

            // Revoke object URLs
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
            if (modifiedPdfUrl) {
                URL.revokeObjectURL(modifiedPdfUrl);
            }
        };
    }, []);

    // Load PDF when file changes or when PDF.js is loaded
    useEffect(() => {
        if (pdfFile && pdfjs && isOpen) {
            loadPdf(pdfFile);
        }
    }, [pdfFile, pdfjs, isOpen]);

    // Render PDF when page changes or when PDF document is loaded
    useEffect(() => {
        if (pdfDoc && canvasRef.current) {
            renderPdf(currentPage);
        }
    }, [pdfDoc, currentPage, editMode, modifiedTextMap, suggestions]);

    // Load PDF file
    const loadPdf = async (file: File) => {
        if (!pdfjs) {
            console.error("PDF.js not loaded yet");
            return;
        }

        setLoading(true);

        try {
            console.log("Loading PDF file:", file.name);

            // Clean up previous resources
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch (error) {
                    console.log(
                        "Error cancelling previous render task:",
                        error
                    );
                }
                renderTaskRef.current = null;
            }
            if (pdfInstanceRef.current) {
                try {
                    pdfInstanceRef.current.destroy();
                } catch (error) {
                    console.log(
                        "Error destroying previous PDF instance:",
                        error
                    );
                }
                pdfInstanceRef.current = null;
            }

            // Read the file as an ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();

            // Create a proper copy of the ArrayBuffer to avoid detached buffer issues
            const uint8Array = new Uint8Array(arrayBuffer);
            const freshBuffer = uint8Array.slice().buffer;

            // Create a URL for the PDF
            const url = URL.createObjectURL(file);
            setPdfUrl(url);

            // Load the PDF with PDF.js
            const loadingTask = pdfjs.getDocument(uint8Array);
            const pdf = await loadingTask.promise;

            // Store references
            setPdfDoc(pdf);
            pdfInstanceRef.current = pdf;
            setNumPages(pdf.numPages);
            setCurrentPage(1);

            // Extract text with positions
            console.log("Extracting text from PDF...");
            const textMap = await extractTextWithPositions(freshBuffer, pdfjs);

            console.log(
                `Extracted ${textMap.blocks.length} text blocks from PDF`
            );

            // Log a sample of the extracted text blocks
            if (textMap.blocks.length > 0) {
                console.log(
                    "Sample text blocks:",
                    textMap.blocks.slice(0, 3).map((block) => ({
                        text:
                            block.text.substring(0, 50) +
                            (block.text.length > 50 ? "..." : ""),
                        position: block.position,
                        pageIndex: block.pageIndex,
                    }))
                );
            }

            setPdfTextMap(textMap);
            setModifiedTextMap(textMap);

            // Generate suggestions based on analysis results
            if (analysisResults) {
                console.log("Generating suggestions from analysis results");
                await generateSuggestions(analysisResults, pdf);
            } else {
                console.warn("No analysis results provided");
            }
        } catch (error) {
            console.error("Error loading PDF:", error);
            if (error instanceof Error) {
                console.error("Error details:", error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // Generate suggestions from analysis results
    const generateSuggestions = async (
        analysisResults: AnalysisResult,
        pdf: any
    ) => {
        try {
            console.log("Starting to generate suggestions...");
            console.log("Analysis results:", analysisResults);

            const newSuggestions: PdfSuggestion[] = [];

            // If there are no sections, but there are suggestions in the old format, create a default section
            if (
                (!analysisResults.sections ||
                    analysisResults.sections.length === 0) &&
                analysisResults.suggestions &&
                analysisResults.suggestions.length > 0
            ) {
                console.log(
                    "Creating a default section for old-format suggestions"
                );

                // Create a default section with the existing suggestions
                const defaultSection = {
                    title: "Suggestions",
                    suggestions: analysisResults.suggestions.map(
                        (suggestion) => ({
                            originalText: suggestion.section,
                            suggestedText: suggestion.content,
                            priority: suggestion.priority,
                        })
                    ),
                };

                // Add improvements if they exist
                if (
                    analysisResults.improvements &&
                    analysisResults.improvements.length > 0
                ) {
                    defaultSection.suggestions.push(
                        ...analysisResults.improvements.map((improvement) => ({
                            originalText: "Improvement",
                            suggestedText: improvement,
                            priority: 5,
                        }))
                    );
                }

                // Create a new analysis results object with the default section
                const newAnalysisResults = {
                    ...analysisResults,
                    sections: [defaultSection],
                };

                // Use the new analysis results
                analysisResults = newAnalysisResults;

                console.log("Created default section:", defaultSection);
                console.log("New analysis results:", analysisResults);
            }

            // Handle the new format with sections
            if (
                analysisResults.sections &&
                analysisResults.sections.length > 0
            ) {
                console.log(
                    `Found ${analysisResults.sections.length} sections in analysis results`
                );

                // Process each suggestion from the analysis results
                for (const section of analysisResults.sections) {
                    console.log(
                        `Processing section: ${section.title} with ${section.suggestions.length} suggestions`
                    );

                    for (const suggestion of section.suggestions) {
                        console.log(
                            `Looking for text: "${suggestion.originalText}"`
                        );

                        // Find the page and position for this suggestion
                        // We'll search through all pages to find the text
                        let foundPage = 0;
                        let foundPosition = null;

                        // Search through all pages
                        for (
                            let pageNum = 1;
                            pageNum <= pdf.numPages;
                            pageNum++
                        ) {
                            const page = await pdf.getPage(pageNum);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items
                                .map((item: any) => item.str)
                                .join(" ");

                            // Check if this page contains the text we're looking for
                            if (pageText.includes(suggestion.originalText)) {
                                console.log(`Found text on page ${pageNum}`);
                                foundPage = pageNum;

                                // Find the position of the text on the page
                                let textX = 0;
                                let textY = 0;
                                let textWidth = 0;
                                let textHeight = 0;
                                let foundItem = false;

                                // Look through text items to find the position
                                for (const item of textContent.items) {
                                    if (
                                        item.str.includes(
                                            suggestion.originalText
                                        )
                                    ) {
                                        textX = item.transform[4];
                                        textY = item.transform[5];
                                        textWidth =
                                            item.width || item.str.length * 5;
                                        textHeight = item.height || 12;
                                        foundItem = true;
                                        console.log(
                                            `Found exact position: x=${textX}, y=${textY}, width=${textWidth}, height=${textHeight}`
                                        );
                                        break;
                                    }
                                }

                                // If we didn't find an exact match, use an approximation
                                if (!foundItem) {
                                    console.log(
                                        "Could not find exact position, using approximation"
                                    );
                                    // Use the first item's position as an approximation
                                    const firstItem = textContent.items[0];
                                    if (firstItem) {
                                        textX = firstItem.transform[4];
                                        textY = firstItem.transform[5];
                                        textWidth = 200; // Default width
                                        textHeight = 20; // Default height
                                    }
                                }

                                foundPosition = {
                                    x: textX,
                                    y: textY,
                                    width: textWidth,
                                    height: textHeight,
                                };
                                break;
                            }
                        }

                        // If we found the text, create a suggestion
                        if (foundPage > 0 && foundPosition) {
                            console.log(
                                `Creating suggestion for text on page ${foundPage}`
                            );
                            newSuggestions.push({
                                id: `suggestion-${newSuggestions.length + 1}`,
                                originalText: suggestion.originalText,
                                suggestedText: suggestion.suggestedText,
                                section: section.title,
                                page: foundPage,
                                position: foundPosition,
                                applied: false,
                                priority: suggestion.priority,
                                type: "suggestion",
                                replaceInPlace: true,
                            });
                        } else {
                            console.log(
                                `Could not find text "${suggestion.originalText}" in the PDF`
                            );

                            // If we couldn't find the text, create a fallback suggestion on page 1
                            console.log(
                                "Creating fallback suggestion on page 1"
                            );
                            newSuggestions.push({
                                id: `suggestion-${newSuggestions.length + 1}`,
                                originalText: suggestion.originalText,
                                suggestedText: suggestion.suggestedText,
                                section: section.title,
                                page: 1, // Default to first page
                                position: {
                                    x: 50,
                                    y: 100 + newSuggestions.length * 50,
                                    width: 400,
                                    height: 50,
                                },
                                applied: false,
                                priority: suggestion.priority,
                                type: "suggestion",
                                replaceInPlace: false,
                            });
                        }
                    }

                    // Process improvements
                    if (section.improvements) {
                        console.log(
                            `Processing ${section.improvements.length} improvements for section: ${section.title}`
                        );

                        for (const improvement of section.improvements) {
                            console.log(
                                `Looking for text: "${improvement.originalText}"`
                            );

                            // Similar logic for improvements
                            let foundPage = 0;
                            let foundPosition = null;

                            // Search through all pages
                            for (
                                let pageNum = 1;
                                pageNum <= pdf.numPages;
                                pageNum++
                            ) {
                                const page = await pdf.getPage(pageNum);
                                const textContent = await page.getTextContent();
                                const pageText = textContent.items
                                    .map((item: any) => item.str)
                                    .join(" ");

                                // Check if this page contains the text we're looking for
                                if (
                                    pageText.includes(improvement.originalText)
                                ) {
                                    console.log(
                                        `Found text on page ${pageNum}`
                                    );
                                    foundPage = pageNum;

                                    // Find the position of the text on the page
                                    let textX = 0;
                                    let textY = 0;
                                    let textWidth = 0;
                                    let textHeight = 0;
                                    let foundItem = false;

                                    // Look through text items to find the position
                                    for (const item of textContent.items) {
                                        if (
                                            item.str.includes(
                                                improvement.originalText
                                            )
                                        ) {
                                            textX = item.transform[4];
                                            textY = item.transform[5];
                                            textWidth =
                                                item.width ||
                                                item.str.length * 5;
                                            textHeight = item.height || 12;
                                            foundItem = true;
                                            console.log(
                                                `Found exact position: x=${textX}, y=${textY}, width=${textWidth}, height=${textHeight}`
                                            );
                                            break;
                                        }
                                    }

                                    // If we didn't find an exact match, use an approximation
                                    if (!foundItem) {
                                        console.log(
                                            "Could not find exact position, using approximation"
                                        );
                                        // Use the first item's position as an approximation
                                        const firstItem = textContent.items[0];
                                        if (firstItem) {
                                            textX = firstItem.transform[4];
                                            textY = firstItem.transform[5];
                                            textWidth = 200; // Default width
                                            textHeight = 20; // Default height
                                        }
                                    }

                                    foundPosition = {
                                        x: textX,
                                        y: textY,
                                        width: textWidth,
                                        height: textHeight,
                                    };
                                    break;
                                }
                            }

                            // If we found the text, create an improvement
                            if (foundPage > 0 && foundPosition) {
                                console.log(
                                    `Creating improvement for text on page ${foundPage}`
                                );
                                newSuggestions.push({
                                    id: `improvement-${
                                        newSuggestions.length + 1
                                    }`,
                                    originalText: improvement.originalText,
                                    suggestedText: improvement.suggestedText,
                                    section: section.title,
                                    page: foundPage,
                                    position: foundPosition,
                                    applied: false,
                                    priority: improvement.priority,
                                    type: "improvement",
                                    replaceInPlace: true,
                                });
                            } else {
                                console.log(
                                    `Could not find text "${improvement.originalText}" in the PDF`
                                );

                                // If we couldn't find the text, create a fallback improvement on page 1
                                console.log(
                                    "Creating fallback improvement on page 1"
                                );
                                newSuggestions.push({
                                    id: `improvement-${
                                        newSuggestions.length + 1
                                    }`,
                                    originalText: improvement.originalText,
                                    suggestedText: improvement.suggestedText,
                                    section: section.title,
                                    page: 1, // Default to first page
                                    position: {
                                        x: 50,
                                        y: 100 + newSuggestions.length * 50,
                                        width: 400,
                                        height: 50,
                                    },
                                    applied: false,
                                    priority: improvement.priority,
                                    type: "improvement",
                                    replaceInPlace: false,
                                });
                            }
                        }
                    }
                }
            } else {
                console.log("Using old format for analysis results");
                // Handle the old format (for backward compatibility)
                // Process formal suggestions
                for (const suggestion of analysisResults.suggestions) {
                    console.log(
                        `Processing suggestion for section: ${suggestion.section}`
                    );

                    // Find a suitable position for this suggestion
                    let foundPage = 1; // Default to first page
                    const foundPosition = {
                        x: 50,
                        y: 100,
                        width: 400,
                        height: 100,
                    };

                    newSuggestions.push({
                        id: `suggestion-${newSuggestions.length + 1}`,
                        originalText: suggestion.section,
                        suggestedText: suggestion.content,
                        section: suggestion.section,
                        page: foundPage,
                        position: foundPosition,
                        applied: false,
                        priority: suggestion.priority,
                        type: "suggestion",
                        replaceInPlace: false,
                    });
                }

                // Process improvements
                if (analysisResults.improvements) {
                    console.log(
                        `Processing ${analysisResults.improvements.length} improvements`
                    );

                    for (
                        let i = 0;
                        i < analysisResults.improvements.length;
                        i++
                    ) {
                        const improvement = analysisResults.improvements[i];
                        console.log(`Processing improvement: ${improvement}`);

                        newSuggestions.push({
                            id: `improvement-${newSuggestions.length + 1}`,
                            originalText: "Improvement",
                            suggestedText: improvement,
                            section: "General Improvements",
                            page: 1, // Default to first page
                            position: {
                                x: 50,
                                y: 200 + i * 50,
                                width: 400,
                                height: 50,
                            },
                            applied: false,
                            priority: 5, // Default priority
                            type: "improvement",
                            replaceInPlace: false,
                        });
                    }
                }
            }

            // Sort suggestions by priority (if available)
            newSuggestions.sort((a, b) => {
                if (a.priority !== undefined && b.priority !== undefined) {
                    return b.priority - a.priority; // Higher priority first
                }
                return 0;
            });

            console.log(`Generated ${newSuggestions.length} suggestions`);
            if (newSuggestions.length > 0) {
                console.log("Sample suggestions:", newSuggestions.slice(0, 2));
            }

            setSuggestions(newSuggestions);
        } catch (error) {
            console.error("Error generating suggestions:", error);
            if (error instanceof Error) {
                console.error("Error details:", error.message);
            }
        }
    };

    // Render PDF page to canvas
    const renderPdf = async (pageNumber: number) => {
        if (!pdfDoc || !canvasRef.current) {
            console.warn("Cannot render PDF: document or canvas not available");
            return;
        }

        try {
            // Cancel any ongoing rendering operation
            if (renderTaskRef.current) {
                try {
                    console.log("Cancelling previous render task");
                    renderTaskRef.current.cancel();
                } catch (error) {
                    console.log(
                        "Error cancelling previous render task:",
                        error
                    );
                }
                renderTaskRef.current = null;
            }

            const canvas = canvasRef.current;
            const context = canvas.getContext("2d", { alpha: false });

            if (!context) {
                console.error("Failed to get canvas context");
                return;
            }

            // Clear the canvas
            context.fillStyle = "white";
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Get the page
            const page = await pdfDoc.getPage(pageNumber);

            // Set appropriate scale for good resolution
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            // Set canvas dimensions to match the viewport
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;

            // Render the PDF page
            const renderContext = {
                canvasContext: context,
                viewport: viewport,
                renderInteractiveForms: true,
            };

            // Start rendering and store the task
            renderTaskRef.current = page.render(renderContext);
            await renderTaskRef.current.promise;
            renderTaskRef.current = null;

            // Draw text blocks if in edit mode
            if (editMode && modifiedTextMap) {
                drawTextBlocks(context, modifiedTextMap, pageNumber, scale);
            }

            // Draw suggestion highlights
            if (suggestions.length > 0) {
                drawSuggestionHighlights(
                    context,
                    suggestions,
                    pageNumber,
                    scale
                );
            }
        } catch (error) {
            console.error("Error rendering PDF:", error);
            if (error instanceof Error) {
                console.error("Error details:", error.message);
            }
        }
    };

    // Draw text blocks on the canvas
    const drawTextBlocks = (
        context: CanvasRenderingContext2D,
        textMap: PdfTextMap,
        pageNumber: number,
        scale: number
    ) => {
        // Find blocks for the current page
        const pageBlocks = textMap.blocks.filter(
            (block) => block.pageIndex === pageNumber - 1
        );

        // Draw rectangles around text blocks
        for (const block of pageBlocks) {
            // Convert coordinates to viewport scale
            const x = block.position.x * scale;
            const y = block.position.y * scale;
            const width = block.position.width * scale;
            const height = block.position.height * scale;

            // Use different colors for modified and unmodified blocks
            if (block.isModified) {
                // Highlight modified blocks with a green semi-transparent overlay
                context.fillStyle = "rgba(0, 255, 0, 0.1)";
                context.fillRect(x, y, width, height);
                context.strokeStyle = "rgba(0, 200, 0, 0.8)";
                context.lineWidth = 2;
                context.strokeRect(x, y, width, height);
            } else {
                // Draw a subtle border around unmodified blocks
                context.strokeStyle = "rgba(200, 200, 200, 0.3)";
                context.lineWidth = 1;
                context.strokeRect(x, y, width, height);
            }
        }
    };

    // Draw suggestion highlights on the canvas
    const drawSuggestionHighlights = (
        context: CanvasRenderingContext2D,
        suggestions: PdfSuggestion[],
        pageNumber: number,
        scale: number
    ) => {
        const pageSuggestions = suggestions.filter(
            (s) => s.page === pageNumber && !s.applied
        );

        for (const suggestion of pageSuggestions) {
            // Convert coordinates to viewport scale
            const x = suggestion.position.x * scale;
            const y = suggestion.position.y * scale;
            const width = suggestion.position.width * scale;
            const height = suggestion.position.height * scale;

            // Draw highlight
            context.fillStyle =
                suggestion.type === "suggestion"
                    ? "rgba(255, 165, 0, 0.2)" // Orange for suggestions
                    : "rgba(0, 191, 255, 0.2)"; // Blue for improvements
            context.fillRect(x, y, width, height);

            // Draw border
            context.strokeStyle =
                suggestion.type === "suggestion"
                    ? "rgba(255, 165, 0, 0.8)"
                    : "rgba(0, 191, 255, 0.8)";
            context.lineWidth = 2;
            context.strokeRect(x, y, width, height);

            // Add suggestion number
            context.font = "bold 12px Arial";
            context.fillStyle =
                suggestion.type === "suggestion"
                    ? "rgba(255, 165, 0, 1)"
                    : "rgba(0, 191, 255, 1)";
            context.fillText(suggestion.id.replace(/\D/g, ""), x + 5, y + 15);
        }
    };

    // Apply a suggestion to the PDF
    const applySuggestion = async (suggestionId: string) => {
        if (!pdfFile || !pdfjs || !pdfTextMap || !modifiedTextMap) {
            console.error("Cannot apply suggestion: missing required data");
            return;
        }

        try {
            setLoading(true);
            setCurrentSuggestionId(suggestionId);

            // Find the suggestion to apply
            const suggestion = suggestions.find((s) => s.id === suggestionId);
            if (!suggestion) {
                console.error(`Suggestion with ID ${suggestionId} not found`);
                return;
            }

            console.log(`Applying suggestion ${suggestionId}:`, suggestion);

            // Find the text block to replace
            const blockToReplace = findTextBlockToReplace(
                modifiedTextMap,
                suggestion.originalText,
                suggestion.position,
                suggestion.page - 1 // Convert to 0-indexed
            );

            if (!blockToReplace) {
                console.error("Could not find text block to replace");
                return;
            }

            console.log("Found text block to replace:", {
                blockText: blockToReplace.text.substring(0, 50) + "...",
                position: blockToReplace.position,
                pageIndex: blockToReplace.pageIndex,
            });

            // Replace the text in the block
            const updatedTextMap = replaceTextInBlock(
                modifiedTextMap,
                blockToReplace,
                suggestion.suggestedText
            );

            // Get the file buffer and create a copy to avoid detached ArrayBuffer issues
            const fileBuffer = await pdfFile.arrayBuffer();
            const bufferCopy = new Uint8Array(fileBuffer).buffer;

            // Regenerate the PDF with the modified text
            const modifiedPdfBytes = await regeneratePdfWithModifiedText(
                bufferCopy,
                updatedTextMap
            );

            // Update the PDF with the modified bytes
            await updatePdfWithModifiedBytes(modifiedPdfBytes, suggestionId);

            // Update the text map with the modified text
            setModifiedTextMap(updatedTextMap);

            console.log(`Successfully applied suggestion ${suggestionId}`);
        } catch (error) {
            console.error("Error applying suggestion:", error);
            if (error instanceof Error) {
                console.error("Error details:", error.message);
            }
        } finally {
            setLoading(false);
            setCurrentSuggestionId(null);
        }
    };

    // Update PDF with modified bytes
    const updatePdfWithModifiedBytes = async (
        modifiedPdfBytes: Uint8Array,
        suggestionId: string
    ) => {
        try {
            // Create a blob from the modified PDF bytes
            const blob = new Blob([modifiedPdfBytes], {
                type: "application/pdf",
            });

            // Create a URL for the modified PDF
            if (modifiedPdfUrl) {
                URL.revokeObjectURL(modifiedPdfUrl);
            }
            const url = URL.createObjectURL(blob);
            setModifiedPdfUrl(url);

            // Mark the suggestion as applied
            setSuggestions((prevSuggestions) =>
                prevSuggestions.map((s) =>
                    s.id === suggestionId ? { ...s, applied: true } : s
                )
            );

            // Load the modified PDF
            const loadingTask = pdfjs.getDocument(modifiedPdfBytes);
            const pdf = await loadingTask.promise;

            // Update the PDF document
            if (pdfInstanceRef.current) {
                try {
                    pdfInstanceRef.current.destroy();
                } catch (error) {
                    console.log(
                        "Error destroying previous PDF instance:",
                        error
                    );
                }
            }

            setPdfDoc(pdf);
            pdfInstanceRef.current = pdf;

            // Render the current page with the updated PDF
            renderPdf(currentPage);
        } catch (error) {
            console.error("Error updating PDF with modified bytes:", error);
            if (error instanceof Error) {
                console.error("Error details:", error.message);
            }
        }
    };

    // Handle applying a suggestion
    const handleApplySuggestion = async (suggestionId: string) => {
        await applySuggestion(suggestionId);
    };

    // Change the current page
    const changePage = async (newPage: number) => {
        if (newPage < 1 || newPage > numPages) return;

        setCurrentPage(newPage);
    };

    // Download the original PDF
    const downloadPdf = () => {
        const urlToDownload = modifiedPdfUrl || pdfUrl;
        if (urlToDownload) {
            const a = document.createElement("a");
            a.href = urlToDownload;
            a.download = pdfFile
                ? pdfFile.name.replace(".pdf", "-edited.pdf")
                : "edited-document.pdf";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    // Download the modified PDF
    const downloadModifiedPdf = async () => {
        if (!modifiedPdfUrl) {
            console.warn("No modified PDF available to download");
            return;
        }

        try {
            // Create a link element and trigger download
            const link = document.createElement("a");
            link.href = modifiedPdfUrl;
            link.download = "modified-cv.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error downloading modified PDF:", error);
        }
    };

    // Sort suggestions by priority
    const sortedSuggestions = [...suggestions].sort((a, b) => {
        // First sort by type (improvements first)
        if (a.type !== b.type) {
            return a.type === "improvement" ? -1 : 1;
        }
        // Then by priority
        const priorityA = a.priority || 3;
        const priorityB = b.priority || 3;
        return priorityB - priorityA; // Higher priority first
    });

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Your CV</DialogTitle>
                    <DialogDescription>
                        Review and apply AI-suggested improvements to your CV
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-1 gap-4 overflow-hidden">
                    {/* PDF Viewer */}
                    <div className="flex-1 overflow-auto border rounded-md p-2 bg-white">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <canvas
                                    ref={canvasRef}
                                    className="max-w-full"
                                />
                                <div className="flex items-center gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            changePage(currentPage - 1)
                                        }
                                        disabled={currentPage <= 1}
                                    >
                                        Previous
                                    </Button>
                                    <span>
                                        Page {currentPage} of {numPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            changePage(currentPage + 1)
                                        }
                                        disabled={currentPage >= numPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Suggestions Panel */}
                    <div className="w-80 overflow-auto">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">
                                Suggested Improvements
                            </h3>
                            <Separator />

                            {suggestions.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No suggestions available
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {suggestions
                                        .filter((s) => !s.applied)
                                        .map((suggestion) => (
                                            <Card
                                                key={suggestion.id}
                                                className="border-l-4"
                                                style={{
                                                    borderLeftColor:
                                                        suggestion.type ===
                                                        "suggestion"
                                                            ? "rgb(255, 165, 0)"
                                                            : "rgb(0, 191, 255)",
                                                }}
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <Badge
                                                            variant={
                                                                suggestion.type ===
                                                                "suggestion"
                                                                    ? "outline"
                                                                    : "secondary"
                                                            }
                                                            className="mb-2"
                                                        >
                                                            {suggestion.section}
                                                        </Badge>
                                                        <Badge
                                                            variant="outline"
                                                            className="ml-2"
                                                        >
                                                            Page{" "}
                                                            {suggestion.page}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm mb-2 line-clamp-2">
                                                        {
                                                            suggestion.suggestedText
                                                        }
                                                    </p>
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 px-2"
                                                            onClick={() =>
                                                                changePage(
                                                                    suggestion.page
                                                                )
                                                            }
                                                        >
                                                            View
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 px-2 bg-green-600 hover:bg-green-700"
                                                            onClick={() =>
                                                                handleApplySuggestion(
                                                                    suggestion.id
                                                                )
                                                            }
                                                            disabled={loading}
                                                        >
                                                            {loading &&
                                                            currentSuggestionId ===
                                                                suggestion.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                "Apply"
                                                            )}
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}

                                    {suggestions.filter((s) => s.applied)
                                        .length > 0 && (
                                        <>
                                            <Separator />
                                            <h4 className="text-md font-medium">
                                                Applied Changes
                                            </h4>
                                            {suggestions
                                                .filter((s) => s.applied)
                                                .map((suggestion) => (
                                                    <Card
                                                        key={suggestion.id}
                                                        className="border-l-4 border-green-500 bg-gray-50"
                                                    >
                                                        <CardContent className="p-4">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="mb-2"
                                                                >
                                                                    {
                                                                        suggestion.section
                                                                    }
                                                                </Badge>
                                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                                            </div>
                                                            <p className="text-sm mb-2 line-clamp-2">
                                                                {
                                                                    suggestion.suggestedText
                                                                }
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={downloadModifiedPdf}
                        disabled={loading || !modifiedPdfUrl}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Download className="h-4 w-4 mr-2" />
                        )}
                        Download Modified CV
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
