/**
 * This file contains prompt templates for the LLM-based data labeling system.
 * These templates are designed to be filled with user-provided data and sent to the AI model.
 */

/**
 * Creates a labeling prompt based on user's intent and the data to be labeled.
 * This is the core prompt that guides the AI in understanding how to label the data.
 * Enhanced to handle hierarchical label structure and support multiple labels per item.
 */
export function createLabelingPrompt(
  datasetDescription: string,
  labelCategories: string[],
  guidelines: string,
  textItem: string
): string {
  const formattedCategories = labelCategories
    .map((category, index) => `${index + 1}. ${category}`)
    .join("\n");

  return `# AI Data Labeling Task

## Your Role
You are an AI Data Labeling Assistant specialized in analyzing text and assigning appropriate labels according to predefined categories and criteria. Your expertise is in understanding context, identifying relevant patterns, and providing thoughtful classification with detailed justification.

## Dataset Context
${datasetDescription}

## Label Categories and Options
${formattedCategories}

## Labeling Guidelines
${guidelines || "No specific guidelines provided."}

## Task Instructions
1. Read the text carefully and understand its full context
2. For each label category, select the most appropriate option based on the evidence in the text
3. Provide detailed reasoning that explains exactly WHY you assigned each label
4. Reference specific phrases, sentences, or elements from the text that support your decision
5. Assign a confidence score (0-100%) that honestly reflects how certain you are, based on:
   - How clearly the text matches the label criteria
   - The amount and quality of supporting evidence
   - The absence of ambiguity or conflicting indicators
6. If your confidence is below 70%, provide a clear explanation of your uncertainty
7. Use the exact label format "Category: Option" where "Category" is the label type and "Option" is one of its available options

## Text to Label
"${textItem}"

## Response Format
Respond in JSON format with the following structure:
{
  "label": "Category: Option", // Example: "Urgency: High" or "Issue Type: Bug"
  "confidence": 85, // Number between 0-100
  "reasoning": "Detailed explanation with specific references to the text content that clearly justify this label choice",
  "uncertainty_explanation": "Only include if confidence < 70%, explaining sources of ambiguity or conflicting evidence"
}
`;
}

/**
 * Creates a batch processing prompt that can handle multiple items at once.
 * This is more efficient for processing multiple items in a single API call.
 */
export function createBatchLabelingPrompt(
  datasetDescription: string,
  labelCategories: string[],
  guidelines: string,
  textItems: string[]
): string {
  const formattedCategories = labelCategories
    .map((category, index) => `${index + 1}. ${category}`)
    .join("\n");

  const formattedItems = textItems
    .map((item, index) => `${index + 1}. "${item}"`)
    .join("\n\n");

  return `# Batch AI Data Labeling Task

## Your Role
You are an AI Data Labeling Assistant specialized in analyzing text and assigning appropriate labels according to predefined categories and criteria. Your task is to process multiple text items efficiently while maintaining careful analysis of each item.

## Dataset Context
${datasetDescription}

## Label Categories and Options
${formattedCategories}

## Labeling Guidelines
${guidelines || "No specific guidelines provided."}

## Task Instructions
1. Read each text item carefully to understand its full context
2. For each item and label category, select the most appropriate option based on evidence
3. You may assign multiple labels to an item if they apply to different aspects/categories
4. For each label, provide detailed reasoning that explains your decision with specific text references
5. Assign honest confidence scores (0-100%) based on:
   - How clearly the text matches the label criteria
   - The amount and quality of supporting evidence
   - The absence of ambiguity or conflicting indicators
6. Use lower confidence scores (below 70%) when evidence is ambiguous or could support multiple interpretations
7. For low confidence labels, clearly explain sources of uncertainty
8. Use the exact label format "Category: Option" where "Category" is the label type and "Option" is one of its available options

## Text Items to Label
${formattedItems}

## Response Format
Respond with a JSON array where each object represents one labeled item:
[
  {
    "itemIndex": 0,
    "label": "Category: Option", // Example: "Urgency: High" or "Issue Type: Bug"
    "confidence": 85, // Number between 0-100
    "reasoning": "Detailed explanation with specific references to the text content that clearly justify this label choice",
    "uncertainty_explanation": "Only include if confidence < 70%, explaining sources of ambiguity or conflicting evidence"
  },
  // Additional items...
]
`;
}
