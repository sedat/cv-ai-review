"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db";
import { documents, suggestions } from "@/db/schema";
import { nanoid } from "nanoid";
import { generateSuggestionsFromAI } from "@/lib/ai-utils";

export async function saveSuggestions(
    documentId: string,
    appliedSuggestionIds: string[]
) {
    const { userId } = auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // Get the document
        const document = await db.query.documents.findFirst({
            where: (documents, { eq }) => eq(documents.id, documentId),
            with: {
                suggestions: true,
            },
        });

        if (!document || document.userId !== userId) {
            throw new Error("Document not found or access denied");
        }

        // Apply suggestions to the document content
        let updatedContent = document.content;
        const appliedSuggestions = document.suggestions
            .filter((s) => appliedSuggestionIds.includes(s.id))
            .sort((a, b) => b.position - a.position); // Apply in reverse to avoid position shifting

        for (const suggestion of appliedSuggestions) {
            updatedContent =
                updatedContent.substring(0, suggestion.position) +
                suggestion.replacement +
                updatedContent.substring(
                    suggestion.position + suggestion.originalText.length
                );
        }

        // Update the document with the new content
        await db
            .update(documents)
            .set({
                content: updatedContent,
                updatedAt: new Date(),
            })
            .where(eq(documents.id, documentId));

        // Update suggestion statuses
        for (const suggestionId of appliedSuggestionIds) {
            await db
                .update(suggestions)
                .set({ applied: true })
                .where(eq(suggestions.id, suggestionId));
        }

        revalidatePath(`/documents/${documentId}`);
        return { success: true };
    } catch (error) {
        console.error("Error applying suggestions:", error);
        return { success: false, error: "Failed to apply suggestions" };
    }
}

export async function generateSuggestions(
    documentId: string,
    jobDescriptionId: string
) {
    const { userId } = auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // Get document and job description
        const document = await db.query.documents.findFirst({
            where: (documents, { eq }) => eq(documents.id, documentId),
        });

        const jobDescription = await db.query.documents.findFirst({
            where: (documents, { eq }) => eq(documents.id, jobDescriptionId),
        });

        if (
            !document ||
            !jobDescription ||
            document.userId !== userId ||
            jobDescription.userId !== userId
        ) {
            throw new Error("Document not found or access denied");
        }

        // Generate suggestions using AI
        const aiSuggestions = await generateSuggestionsFromAI(
            document.content,
            jobDescription.content
        );

        // Save suggestions to database
        const dbSuggestions = aiSuggestions.map((suggestion) => ({
            id: nanoid(),
            documentId,
            position: suggestion.position,
            originalText: suggestion.originalText,
            replacement: suggestion.replacement,
            reason: suggestion.reason,
            type: suggestion.type,
            applied: false,
            createdAt: new Date(),
        }));

        await db.insert(suggestions).values(dbSuggestions);

        revalidatePath(`/documents/${documentId}`);
        return { success: true };
    } catch (error) {
        console.error("Error generating suggestions:", error);
        return { success: false, error: "Failed to generate suggestions" };
    }
}
