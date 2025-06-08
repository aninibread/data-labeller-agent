import { useState } from "react";
import type {
  LabelingIntent,
  LabelCategory,
} from "@/components/data-labeler/IntentCapture";
import type {
  DataItem,
  LabelResult,
  BatchLabelingResult,
} from "@/lib/labelingAgent";

/**
 * Hook for interacting with the data labeling service
 */
export function useLabelingService() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BatchLabelingResult | null>(null);

  /**
   * Helper function to format comprehensive guidelines for the API
   */
  const formatGuidelines = (intent: LabelingIntent): string => {
    let guidelines = "";

    // Add general guidelines section with header
    if (intent.generalGuidelines && intent.generalGuidelines.trim()) {
      guidelines +=
        "# GENERAL LABELING GUIDELINES\n" + intent.generalGuidelines + "\n\n";
    }

    // Add detailed instructions for each category
    if (intent.labelCategories.length > 0) {
      guidelines += "# CATEGORY-SPECIFIC GUIDELINES\n\n";

      intent.labelCategories.forEach((category, index) => {
        guidelines += `## ${index + 1}. ${category.type.toUpperCase()}\n`;

        // Add category guideline if available
        if (category.guideline && category.guideline.trim()) {
          guidelines += `${category.guideline}\n\n`;
        }

        // Add detailed option guidelines with examples
        if (category.options.length > 0) {
          guidelines += "Options and their criteria:\n";

          category.options.forEach((option, optIndex) => {
            guidelines += `${optIndex + 1}. **${option.name}**: `;
            if (option.description && option.description.trim()) {
              guidelines += `${option.description}\n`;
            } else {
              guidelines += "No specific criteria provided.\n";
            }
          });
        }

        guidelines += "\n";
      });
    }

    // Add instructions for handling edge cases and format requirements
    guidelines += "# HANDLING DIFFICULT CASES\n";
    guidelines +=
      "- If content is ambiguous between multiple options, select the most prominent or relevant option\n";
    guidelines +=
      "- If content contains mixed signals, assign lower confidence and explain the ambiguity\n";
    guidelines +=
      "- Always prioritize explicit textual evidence over inferences\n\n";

    // Add explicit label format instructions
    guidelines += "# LABEL FORMAT REQUIREMENTS\n";
    guidelines += "- IMPORTANT: Always format labels as 'Category: Option'\n";
    guidelines +=
      "- The Category MUST be the exact category name (e.g., 'Issue Type', 'Urgency', etc.)\n";
    guidelines +=
      "- The Option MUST be one of the available options for that category\n";
    guidelines +=
      "- Example: 'Issue Type: Bug', NOT 'Bug: Bug' or just 'Bug'\n";
    guidelines +=
      "- Example: 'Urgency: High', NOT 'High: High' or just 'High'\n";

    return guidelines;
  };

  /**
   * Post-process results to ensure each item has multiple labels where appropriate
   */
  const postProcessResults = (
    results: LabelResult[],
    intent: LabelingIntent,
    data: { text: string; id: string }[]
  ): LabelResult[] => {
    // Group results by item ID
    const groupedByItem = results.reduce<Record<string, LabelResult[]>>(
      (acc, result) => {
        if (!acc[result.itemId]) {
          acc[result.itemId] = [];
        }
        acc[result.itemId].push(result);
        return acc;
      },
      {}
    );

    // Enhance results to ensure label diversity
    const enhancedResults: LabelResult[] = [];

    Object.entries(groupedByItem).forEach(([itemId, itemResults]) => {
      // Get all used label types for this item
      const usedLabelTypes = new Set(
        itemResults.map((r) => r.label.split(":")[0].trim())
      );

      // Add the original results
      enhancedResults.push(...itemResults);

      // Ensure at least one label per category where possible (when multiple categories exist)
      if (
        intent.labelCategories.length > 1 &&
        usedLabelTypes.size < intent.labelCategories.length
      ) {
        // Find unused categories
        intent.labelCategories.forEach((category) => {
          if (
            !usedLabelTypes.has(category.type) &&
            category.options.length > 0
          ) {
            // Add a label for this unused category with the first option
            const option = category.options[0];
            // Instead of synthesizing reasoning, use special flag to indicate that this needs LLM reasoning
            // Ensure the label follows the correct Category: Option format
            enhancedResults.push({
              itemId,
              label: `${category.type}: ${option.name}`, // Correct format: Category: Option
              confidence: 0, // Will be replaced by LLM-generated confidence
              reasoning:
                "[This label was added automatically to ensure all categories are covered. Please review and update as needed.]",
              uncertaintyExplanation:
                "This label was automatically added and requires human verification.",
              needsReview: true, // Flag for review since this is auto-generated
              needsLLMReasoning: true, // Special flag to indicate this needs real LLM reasoning
            });
          }
        });
      }
    });

    return enhancedResults;
  };

  /**
   * Submit data for labeling
   */
  const labelData = async (
    data: { text: string; id: string }[],
    intent: LabelingIntent
  ): Promise<BatchLabelingResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const startTime = Date.now();

      // Prepare the data for the API call
      const apiData = data.map((item) => ({
        id: item.id,
        text: item.text,
      }));

      // Convert our IntentCapture format to the API's expected format with enriched context
      const apiIntent = {
        datasetDescription: intent.datasetDescription,
        // Create detailed label categories with options and descriptions
        // Format: Categories with options listed separately to avoid confusion
        labelCategories: intent.labelCategories.map(
          (cat) =>
            `${cat.type}: ${cat.options.map((opt) => opt.name).join(" | ")}`
        ),
        // Combine all guidelines into a comprehensive instruction set
        guidelines: formatGuidelines(intent),
      };

      // REAL API CALL to the labeling service
      const response = await fetch("/api/label", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: apiData,
          intent: apiIntent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process data");
      }

      const resultData: BatchLabelingResult = await response.json();

      // Post-process the results to create multiple labels per item
      let processedResults = postProcessResults(
        resultData.results,
        intent,
        data
      );

      // Check if any results need LLM reasoning
      const needsReasoningResults = processedResults.filter(
        (r) => (r as any).needsLLMReasoning
      );

      // If we have results that need reasoning, generate it
      if (needsReasoningResults.length > 0) {
        // Generate reasoning for these results
        processedResults = await generateReasoningForLabels(
          processedResults,
          intent,
          data
        );
      }

      // Update the results with processed results
      resultData.results = processedResults;

      // Update processing time to include our post-processing
      resultData.processingTimeMs = Date.now() - startTime;

      // Store the results
      setResults(resultData);
      return resultData;
    } catch (err) {
      console.error("Error labeling data:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Generate reasoning for labels that need it using the LLM
   */
  const generateReasoningForLabels = async (
    results: LabelResult[],
    intent: LabelingIntent,
    data: { text: string; id: string }[]
  ): Promise<LabelResult[]> => {
    // Create a copy of the results
    const updatedResults = [...results];

    // Find all results that need LLM reasoning
    const needsReasoningResults = updatedResults.filter(
      (r) => (r as any).needsLLMReasoning
    );
    if (needsReasoningResults.length === 0) return updatedResults;

    // Group by item ID to minimize API calls
    const itemsToProcess = new Map<
      string,
      {
        item: { text: string; id: string };
        labels: Array<{ index: number; label: string }>;
      }
    >();

    // Group labels by item
    needsReasoningResults.forEach((result, index) => {
      const itemId = result.itemId;
      const item = data.find((d) => d.id === itemId);

      if (!item) return;

      if (!itemsToProcess.has(itemId)) {
        itemsToProcess.set(itemId, { item, labels: [] });
      }

      // Find the index in the original array
      const originalIndex = updatedResults.findIndex(
        (r) => r.itemId === result.itemId && r.label === result.label
      );

      if (originalIndex !== -1) {
        itemsToProcess.get(itemId)!.labels.push({
          index: originalIndex,
          label: result.label,
        });
      }
    });

    // Process each item
    for (const [itemId, itemData] of itemsToProcess.entries()) {
      try {
        // Create a prompt to generate reasoning for this item and its labels
        const prompt = `
# Label Reasoning and Confidence Assessment

## Your Role
You are an expert Data Labeling Quality Assessor responsible for providing detailed justifications for labels and assessing confidence levels. You excel at identifying textual evidence that supports specific label assignments.

## Dataset Context
${intent.datasetDescription}

## Labeling Guidelines
${formatGuidelines(intent)}

## Text to Analyze
"${itemData.item.text}"

## Labels to Justify
${itemData.labels.map((l) => `- ${l.label}`).join("\n")}

## Task Instructions
For each of the labels listed above:
1. Carefully analyze whether and how the label applies to the text
2. Provide detailed reasoning that explains the SPECIFIC connection between text content and the label
3. Cite exact phrases or sentences from the text as evidence
4. Assign a confidence score (0-100) based on:
   - The strength and relevance of the supporting evidence in the text
   - The clarity of the match between text and label criteria
   - The absence of contradicting information
5. For any label with confidence below 70, provide a clear explanation of why you're uncertain

Format your response as a JSON object with label names as keys and objects containing reasoning, confidence, and optional uncertainty explanation.

## Response Format Example
{
  "Category1: Option1": {
    "reasoning": "This text shows clear signs of [specific characteristic] as evidenced by the phrase '[exact quote from text]'. Additionally, the author mentions '[another exact quote]' which strongly indicates [relevant aspect of the label].",
    "confidence": 85
  },
  "Category2: Option2": {
    "reasoning": "While the text contains some elements suggesting [label aspect] such as '[exact quote]', there are also contradicting elements like '[contradicting quote]'.",
    "confidence": 65,
    "uncertainty": "The mixed signals in the text make it difficult to assign this label with high confidence. The mention of '[ambiguous quote]' could be interpreted multiple ways."
  }
}
`;

        // Call the API to generate reasoning
        const response = await fetch("/api/completion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate reasoning");
        }

        const reasoningData = await response.json();

        // Parse the reasoning JSON
        const reasoningJson = JSON.parse(reasoningData.completion);

        // Update the results with the generated reasoning and confidence
        itemData.labels.forEach((labelInfo) => {
          const labelData = reasoningJson[labelInfo.label];

          if (labelData) {
            const { reasoning, confidence, uncertainty } =
              typeof labelData === "string"
                ? {
                    reasoning: labelData,
                    confidence: 75,
                    uncertainty: undefined,
                  } // Handle string format for backward compatibility
                : labelData;

            // Update the reasoning in the results array
            updatedResults[labelInfo.index] = {
              ...updatedResults[labelInfo.index],
              reasoning: reasoning || updatedResults[labelInfo.index].reasoning,
              confidence:
                confidence || updatedResults[labelInfo.index].confidence,
              uncertaintyExplanation: uncertainty,
              needsReview:
                confidence < 70 || updatedResults[labelInfo.index].needsReview,
              // Remove the special flag
              needsLLMReasoning: undefined,
            };
          }
        });
      } catch (error) {
        console.error(`Error generating reasoning for item ${itemId}:`, error);

        // Update with generic reasoning and confidence if we failed
        itemData.labels.forEach((labelInfo) => {
          updatedResults[labelInfo.index] = {
            ...updatedResults[labelInfo.index],
            reasoning: `This label was suggested for this content based on the labeling guidelines. Please review and update as needed.`,
            confidence: Math.max(
              60,
              updatedResults[labelInfo.index].confidence
            ), // Ensure reasonable confidence
            uncertaintyExplanation:
              "There was an issue generating detailed analysis for this label.",
            needsReview: true,
            // Remove the special flag
            needsLLMReasoning: undefined,
          };
        });
      }
    }

    return updatedResults;
  };

  /**
   * Update a label after human review
   */
  const updateLabel = (itemId: string, newLabel: string) => {
    if (!results) return;

    // Find all instances of this item ID (there may be multiple labels per item)
    const updatedResults = results.results.map((result) => {
      if (result.itemId === itemId && result.label === newLabel) {
        // Only update the specific label that matches both item ID and label
        return {
          ...result,
          needsReview: false,
          confidence: 100, // Set to 100% since human-verified
        };
      }
      return result;
    });

    setResults({
      ...results,
      results: updatedResults,
      reviewNeeded: updatedResults.filter((r) => r.needsReview).length,
    });
  };

  /**
   * Export results to CSV format
   */
  const exportToCsv = (): string => {
    if (!results || results.results.length === 0) {
      return "No data available for export";
    }

    // Create header row
    const header = "ItemId,Label,Confidence,Reasoning,NeedsReview\n";

    // Create a row for each result
    const rows = results.results
      .map((result) => {
        return [
          result.itemId,
          `"${result.label.replace(/"/g, '""')}"`,
          result.confidence,
          `"${result.reasoning.replace(/"/g, '""')}"`,
          result.needsReview ? "Yes" : "No",
        ].join(",");
      })
      .join("\n");

    return header + rows;
  };

  return {
    labelData,
    updateLabel,
    exportToCsv,
    isProcessing,
    results,
    error,
  };
}
