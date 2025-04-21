"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { AnalysisResult } from "@/lib/analyze-cv";

export default function CvUploadForm() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const onSubmit = async (data: any) => {
        try {
            setIsAnalyzing(true);
            setError(null);

            const formData = new FormData();
            formData.append("cv", data.cv[0]);
            formData.append("jobDescription", data.jobDescription);

            const response = await fetch("/api/analyze-cv", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to analyze CV");
            }

            const result = await response.json();
            setAnalysis(result);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "An unknown error occurred"
            );
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="container mx-auto max-w-3xl py-8">
            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>CV Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="cv">Upload your CV (PDF)</Label>
                            <Input
                                id="cv"
                                type="file"
                                accept=".pdf"
                                {...register("cv", {
                                    required: "CV is required",
                                })}
                            />
                            {errors.cv && (
                                <p className="text-sm text-red-500 mt-1">
                                    {errors.cv.message as string}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="jobDescription">
                                Job Description
                            </Label>
                            <Textarea
                                id="jobDescription"
                                rows={6}
                                placeholder="Paste the job description here..."
                                {...register("jobDescription", {
                                    required: "Job description is required",
                                })}
                            />
                            {errors.jobDescription && (
                                <p className="text-sm text-red-500 mt-1">
                                    {errors.jobDescription.message as string}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={isAnalyzing}
                            className="w-full"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                "Analyze CV"
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </form>

            {error && (
                <Card className="mb-6 border-red-300">
                    <CardContent className="pt-6">
                        <p className="text-red-500">{error}</p>
                    </CardContent>
                </Card>
            )}

            {analysis && (
                <Card>
                    <CardHeader>
                        <CardTitle>Analysis Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium">Summary</h3>
                            <p>{analysis.summary}</p>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium">
                                Keyword Match
                            </h3>
                            <p>Score: {analysis.keywordMatch.score}/10</p>
                            {analysis.keywordMatch.missingKeywords.length >
                                0 && (
                                <div className="mt-2">
                                    <p className="font-medium">
                                        Missing Keywords:
                                    </p>
                                    <ul className="list-disc pl-5">
                                        {analysis.keywordMatch.missingKeywords.map(
                                            (keyword, i) => (
                                                <li key={i}>{keyword}</li>
                                            )
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-lg font-medium">Strengths</h3>
                            <ul className="list-disc pl-5">
                                {analysis.strengths.map((strength, i) => (
                                    <li key={i}>{strength}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium">
                                Areas for Improvement
                            </h3>
                            <ul className="list-disc pl-5">
                                {analysis.improvements.map((improvement, i) => (
                                    <li key={i}>{improvement}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium">Suggestions</h3>
                            {analysis.suggestions.map((suggestion, i) => (
                                <div key={i} className="mb-3">
                                    <p className="font-medium">
                                        {suggestion.section}:
                                    </p>
                                    <p>{suggestion.content}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
