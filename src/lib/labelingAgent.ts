import {
  createLabelingPrompt,
  createBatchLabelingPrompt,
} from "./promptTemplates";

export type LabelingIntent = {
  datasetDescription: string;
  labelCategories: string[];
  guidelines: string;
};

export type DataItem = {
  text: string;
  id: string;
};

export type LabelResult = {
  itemId: string;
  label: string;
  confidence: number;
  reasoning: string;
  uncertaintyExplanation?: string;
  needsReview: boolean;
};

export type BatchLabelingResult = {
  results: LabelResult[];
  completedAt: string;
  processingTimeMs: number;
  totalItems: number;
  reviewNeeded: number;
};

/**
 * Processes a single data item using the AI labeling service
 */
export async function labelDataItem(
  item: DataItem,
  intent: LabelingIntent,
  env: any // This would be the Cloudflare env with AI binding
): Promise<LabelResult> {
  try {
    const prompt = createLabelingPrompt(
      intent.datasetDescription,
      intent.labelCategories,
      intent.guidelines,
      item.text
    );

    // Call Cloudflare Workers AI
    const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
      prompt: prompt,
      max_tokens: 500,
    });

    // Parse the response - extract JSON from the response text
    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and potentially fix the label format
    let label = result.label || "";

    // Check if the label is duplicated (e.g., "Bug: Bug" instead of "Issue Type: Bug")
    const labelParts = label.split(":").map((part) => part.trim());
    if (labelParts.length === 2 && labelParts[0] === labelParts[1]) {
      // Try to find a matching category from the provided categories
      const matchingCategory = labelCategories.find((cat) =>
        cat.toLowerCase().includes(labelParts[0].toLowerCase())
      );

      if (matchingCategory) {
        // Extract just the category name before any details
        const categoryName = matchingCategory.split(":")[0].trim();
        // Fix the label format
        label = `${categoryName}: ${labelParts[1]}`;
      }
    }

    // Get confidence from result, defaulting to 75 if not provided
    const confidence =
      typeof result.confidence === "number" ? result.confidence : 75;

    // Determine if this item needs human review
    const needsReview = confidence < 70;

    // Ensure we have a valid reasoning
    let reasoning = result.reasoning;
    if (!reasoning || reasoning.trim().length === 0) {
      reasoning = `This item was classified as "${result.label}" based on the content and the provided labeling guidelines.`;
    }

    return {
      itemId: item.id,
      label: label, // Use the validated/fixed label
      confidence: confidence,
      reasoning: reasoning,
      uncertaintyExplanation: result.uncertainty_explanation,
      needsReview,
    };
  } catch (error) {
    console.error("Error labeling item", error);

    // Return a fallback result indicating failure with detailed reasoning
    return {
      itemId: item.id,
      label: "Error: Needs Manual Review",
      confidence: 0,
      reasoning: `The AI model encountered an error while processing this item. Error details: ${error instanceof Error ? error.message : "Unknown error"}. Please assign a label manually.`,
      uncertaintyExplanation:
        "This item requires manual labeling due to processing errors.",
      needsReview: true,
    };
  }
}

/**
 * Processes a batch of data items using the AI labeling service
 * This is more efficient than processing items one by one
 */
export async function labelDataBatch(
  items: DataItem[],
  intent: LabelingIntent,
  env: any, // This would be the Cloudflare env with AI binding
  batchSize: number = 10 // Default batch size, can be adjusted based on model capacity
): Promise<BatchLabelingResult> {
  const startTime = Date.now();
  const results: LabelResult[] = [];
  const batches: DataItem[][] = [];

  // Split items into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Process each batch
  for (const batch of batches) {
    try {
      // For very small batches, process items individually
      if (batch.length === 1) {
        const result = await labelDataItem(batch[0], intent, env);
        results.push(result);
        continue;
      }

      // Create a batch prompt for multiple items
      const prompt = createBatchLabelingPrompt(
        intent.datasetDescription,
        intent.labelCategories,
        intent.guidelines,
        batch.map((item) => item.text)
      );

      // Call Cloudflare Workers AI
      const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        prompt: prompt,
        max_tokens: 1500, // Increase token limit for batch processing
      });

      // Parse the response - extract JSON array from the response text
      const jsonMatch = response.response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI batch response");
      }

      const batchResults = JSON.parse(jsonMatch[0]);

      // Map the batch results to our expected format
      batch.forEach((item, index) => {
        const result = batchResults[index];
        if (!result) return;

        // Ensure we have a valid reasoning
        let reasoning = result.reasoning;
        if (!reasoning || reasoning.trim().length === 0) {
          reasoning = `This item was classified as "${result.label}" based on the content and the provided labeling guidelines.`;
        }

        // Get confidence from result, defaulting to 75 if not provided
        const confidence =
          typeof result.confidence === "number" ? result.confidence : 75;

        // Validate and potentially fix the label format
        let label = result.label || "";

        // Check if the label is duplicated (e.g., "Bug: Bug" instead of "Issue Type: Bug")
        const labelParts = label.split(":").map((part) => part.trim());
        if (labelParts.length === 2 && labelParts[0] === labelParts[1]) {
          // Try to find a matching category from the provided categories
          const matchingCategory = labelCategories.find((cat) =>
            cat.toLowerCase().includes(labelParts[0].toLowerCase())
          );

          if (matchingCategory) {
            // Extract just the category name before any details
            const categoryName = matchingCategory.split(":")[0].trim();
            // Fix the label format
            label = `${categoryName}: ${labelParts[1]}`;
          }
        }

        results.push({
          itemId: item.id,
          label: label, // Use the validated/fixed label
          confidence: confidence,
          reasoning: reasoning,
          uncertaintyExplanation: result.uncertainty_explanation,
          needsReview: confidence < 70,
        });
      });
    } catch (error) {
      console.error("Error processing batch", error);

      // Add error results for this batch with more detailed reasoning
      batch.forEach((item) => {
        results.push({
          itemId: item.id,
          label: "Error: Needs Manual Review",
          confidence: 0,
          reasoning: `The AI model encountered an error while processing this batch of items. Error details: ${error instanceof Error ? error.message : "Unknown error"}. Please assign a label manually.`,
          uncertaintyExplanation:
            "This item requires manual labeling due to batch processing errors.",
          needsReview: true,
        });
      });
    }
  }

  const processingTimeMs = Date.now() - startTime;
  const reviewNeeded = results.filter((r) => r.needsReview).length;

  return {
    results,
    completedAt: new Date().toISOString(),
    processingTimeMs,
    totalItems: items.length,
    reviewNeeded,
  };
}
