"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, File } from "lucide-react";

interface FileUploaderProps {
    onFileUpload: (file: File) => void;
    acceptedFileTypes?: string;
}

export function FileUploader({
    onFileUpload,
    acceptedFileTypes = ".pdf,.txt",
}: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const validateFile = (file: File): boolean => {
        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setError("File is too large. Maximum size is 5MB.");
            return false;
        }

        // Check file type
        const fileType = file.name.split(".").pop()?.toLowerCase();
        const validTypes = acceptedFileTypes
            .split(",")
            .map((type) => type.trim().replace(".", "").toLowerCase());

        if (!fileType || !validTypes.includes(fileType)) {
            setError(
                `Invalid file type. Please upload ${acceptedFileTypes.replace(
                    /\./g,
                    ""
                )} files.`
            );
            return false;
        }

        setError(null);
        return true;
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (validateFile(file)) {
                onFileUpload(file);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (validateFile(file)) {
                onFileUpload(file);
            }
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-2">
            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging
                        ? "border-primary bg-primary/5"
                        : "border-slate-300 dark:border-slate-700 hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.txt"
                />

                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full">
                        <Upload className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        <p className="font-medium">
                            Click to upload or drag and drop
                        </p>
                        <p>PDF or TXT files (max. 5MB)</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleButtonClick}
                        className="mt-2"
                    >
                        <File className="mr-2 h-4 w-4" />
                        Select File
                    </Button>
                </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}
