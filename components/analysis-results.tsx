import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
    CheckCircle,
    AlertCircle,
    ArrowRight,
    Info,
    Star,
    FileEdit,
} from "lucide-react";
import type { AnalysisResult } from "@/components/cv-optimizer";
import { useState } from "react";
import { PdfEditorModal } from "@/components/pdf-editor-modal";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnalysisResultsProps {
    results: AnalysisResult;
    pdfFile?: File | null;
}

export function AnalysisResults({ results, pdfFile }: AnalysisResultsProps) {
    const { summary, keywordMatch, suggestions, strengths, improvements } =
        results;

    const [isPdfEditorOpen, setIsPdfEditorOpen] = useState(false);

    // Sort suggestions by priority if available
    const sortedSuggestions = [...suggestions].sort((a, b) => {
        const priorityA = a.priority || 3;
        const priorityB = b.priority || 3;
        return priorityB - priorityA; // Higher priority first
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-100">
                        CV Analysis Results
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300">
                        {summary}
                    </p>
                </div>

                {pdfFile && (
                    <Button
                        onClick={() => setIsPdfEditorOpen(true)}
                        className="flex items-center gap-2 w-full sm:w-auto"
                        size="lg"
                        variant="default"
                    >
                        <FileEdit className="h-5 w-5" />
                        Edit PDF with Suggestions
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>Keyword Match Score</span>
                        <span className="text-xl font-bold">
                            {keywordMatch.score}%
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div>
                            <div className="mb-2">
                                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div
                                        className={`h-full ${getScoreColorClass(
                                            keywordMatch.score
                                        )} transition-all`}
                                        style={{
                                            width: `${keywordMatch.score}%`,
                                        }}
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                {getScoreDescription(keywordMatch.score)}
                            </p>
                        </div>

                        {/* Matched Keywords */}
                        {keywordMatch.matchedKeywords &&
                            keywordMatch.matchedKeywords.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium mb-2 flex items-center">
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                        Keywords Found in Your CV
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {keywordMatch.matchedKeywords.map(
                                            (
                                                keyword: string,
                                                index: number
                                            ) => {
                                                // Find importance if available
                                                const keywordInfo =
                                                    keywordMatch.importanceWeights?.find(
                                                        (k) =>
                                                            k.keyword.toLowerCase() ===
                                                            keyword.toLowerCase()
                                                    );

                                                return (
                                                    <TooltipProvider
                                                        key={index}
                                                    >
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Badge
                                                                    variant="outline"
                                                                    className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800 flex items-center gap-1"
                                                                >
                                                                    {keyword}
                                                                    {keywordInfo && (
                                                                        <span className="flex items-center ml-1">
                                                                            <Star className="h-3 w-3 fill-current" />
                                                                            <span className="text-xs ml-0.5">
                                                                                {
                                                                                    keywordInfo.importance
                                                                                }
                                                                            </span>
                                                                        </span>
                                                                    )}
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {keywordInfo
                                                                    ? `Importance: ${keywordInfo.importance}/10`
                                                                    : "Found in your CV"}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>
                            )}

                        {/* Missing Keywords */}
                        {keywordMatch.missingKeywords.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium mb-2 flex items-center">
                                    <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                                    Missing Keywords
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {keywordMatch.missingKeywords.map(
                                        (keyword: string, index: number) => {
                                            // Find importance if available
                                            const keywordInfo =
                                                keywordMatch.importanceWeights?.find(
                                                    (k) =>
                                                        k.keyword.toLowerCase() ===
                                                        keyword.toLowerCase()
                                                );

                                            return (
                                                <TooltipProvider key={index}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge
                                                                key={index}
                                                                variant="outline"
                                                                className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800 flex items-center gap-1"
                                                            >
                                                                {keyword}
                                                                {keywordInfo && (
                                                                    <span className="flex items-center ml-1">
                                                                        <Star className="h-3 w-3 fill-current" />
                                                                        <span className="text-xs ml-0.5">
                                                                            {
                                                                                keywordInfo.importance
                                                                            }
                                                                        </span>
                                                                    </span>
                                                                )}
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {keywordInfo
                                                                ? `Importance: ${keywordInfo.importance}/10`
                                                                : "Consider adding this keyword"}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-lg text-green-600 dark:text-green-400">
                            <CheckCircle className="mr-2 h-5 w-5" />
                            Strengths
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {strengths.map((strength, index) => (
                                <li key={index} className="flex items-start">
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>{strength}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center text-lg text-amber-600 dark:text-amber-400">
                            <AlertCircle className="mr-2 h-5 w-5" />
                            Areas for Improvement
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {improvements.map((improvement, index) => (
                                <li key={index} className="flex items-start">
                                    <ArrowRight className="mr-2 h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <span>{improvement}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        Suggested Improvements
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-5">
                        {sortedSuggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                            >
                                {index > 0 && (
                                    <Separator className="my-4 hidden" />
                                )}
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-medium flex items-center">
                                        {suggestion.section}
                                    </h4>
                                    {suggestion.priority && (
                                        <Badge
                                            variant="outline"
                                            className={`${getPriorityColorClass(
                                                suggestion.priority
                                            )} flex items-center gap-1`}
                                        >
                                            <Info className="h-3 w-3" />
                                            Priority: {suggestion.priority}/5
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-slate-600 dark:text-slate-300">
                                    {suggestion.content}
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {pdfFile && (
                <PdfEditorModal
                    isOpen={isPdfEditorOpen}
                    onClose={() => setIsPdfEditorOpen(false)}
                    pdfFile={pdfFile}
                    analysisResults={results}
                />
            )}
        </div>
    );
}

// Helper function to get color class based on score
function getScoreColorClass(score: number): string {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-green-400";
    if (score >= 40) return "bg-yellow-500";
    if (score >= 20) return "bg-orange-500";
    return "bg-red-500";
}

// Helper function to get score description
function getScoreDescription(score: number): string {
    if (score >= 80)
        return "Excellent match! Your CV is well-aligned with the job requirements.";
    if (score >= 60)
        return "Good match. With a few adjustments, your CV could be more competitive.";
    if (score >= 40)
        return "Moderate match. Consider addressing the missing keywords to improve your chances.";
    if (score >= 20)
        return "Limited match. Your CV needs significant updates to align with this job.";
    return "Low match. You may need to develop additional skills or experience for this role.";
}

// Helper function to get priority color class
function getPriorityColorClass(priority: number): string {
    switch (priority) {
        case 5:
            return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800";
        case 4:
            return "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800";
        case 3:
            return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
        case 2:
            return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800";
        case 1:
        default:
            return "bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-300 border-slate-200 dark:border-slate-800";
    }
}
