import React, { useState, useImperativeHandle } from "react";
import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import { Textarea } from "@/components/textarea/Textarea";
import { Label } from "@/components/label/Label";
import { Input } from "@/components/input/Input";

export type LabelOption = {
  name: string;
  description: string;
};

export type LabelCategory = {
  type: string;
  guideline: string;
  options: LabelOption[];
};

export type LabelingIntent = {
  datasetDescription: string;
  labelCategories: LabelCategory[];
  generalGuidelines: string;
};

type IntentCaptureProps = {
  onIntentCaptured: (intent: LabelingIntent) => void;
  ref?: React.RefObject<{
    handleContinue: () => void;
  }>;
};

export const IntentCapture = React.forwardRef<
  { handleContinue: () => void },
  IntentCaptureProps
>(({ onIntentCaptured }, ref) => {
  // Use a single text field for the entire configuration
  const [configText, setConfigText] = useState(`# Labeling Instructions Template

## Dataset Description
[REPLACE THIS WITH YOUR DATASET DESCRIPTION]
Examples:
- Customer support tickets that need to be categorized by issue type and urgency
- Product reviews that need sentiment analysis and feature identification
- News articles that need to be classified by topic and tone

## Label Categories
[YOU MUST ADD AT LEAST ONE LABEL CATEGORY]
[FOLLOW THE FORMAT BELOW FOR EACH CATEGORY]

### [Category Name, e.g. Urgency]
[CATEGORY DESCRIPTION, e.g. How quickly this item needs attention]

- [Option Name, e.g. High]: [Option Description, e.g. Requires immediate attention]
- [Option Name, e.g. Medium]: [Option Description, e.g. Should be addressed within 24 hours]
- [Option Name, e.g. Low]: [Option Description, e.g. Can be addressed when time permits]

### [Category Name, e.g. Issue Type]
[CATEGORY DESCRIPTION, e.g. The type of problem being reported]

- [Option Name, e.g. Technical]: [Option Description, e.g. Related to software bugs or technical issues]
- [Option Name, e.g. Billing]: [Option Description, e.g. Related to payments, charges, or account billing]
- [Option Name, e.g. Feature Request]: [Option Description, e.g. Suggestions for new features or improvements]

## General Guidelines
[ADD ANY GENERAL INSTRUCTIONS FOR LABELERS HERE]
Examples:
- If an item could belong to multiple categories, choose the most prominent one
- Label items based on explicit content, not assumptions about intent
- When uncertain between two options, choose the more specific one
- Consider the entire text before assigning labels, not just keywords
`);

  // For backward compatibility, still maintain these state variables
  const [datasetDescription, setDatasetDescription] = useState("");
  const [labelCategories, setLabelCategories] = useState<LabelCategory[]>([]);
  const [generalGuidelines, setGeneralGuidelines] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Expose the handleContinue method to the parent component
  useImperativeHandle(ref, () => ({
    handleContinue: () => {
      console.log("IntentCapture handleContinue called");
      handleSubmit();
    },
  }));

  const handleAddLabel = () => {
    setLabelCategories([
      ...labelCategories,
      {
        type: "",
        guideline: "",
        options: [{ name: "", description: "" }],
      },
    ]);
  };

  const handleRemoveLabel = (index: number) => {
    if (labelCategories.length > 1) {
      const newCategories = [...labelCategories];
      newCategories.splice(index, 1);
      setLabelCategories(newCategories);
    }
  };

  const handleLabelChange = (
    index: number,
    field: "type" | "guideline",
    value: string
  ) => {
    const newCategories = [...labelCategories];
    newCategories[index][field] = value;
    setLabelCategories(newCategories);
  };

  const handleAddOption = (categoryIndex: number) => {
    const newCategories = [...labelCategories];
    newCategories[categoryIndex].options.push({ name: "", description: "" });
    setLabelCategories(newCategories);
  };

  const handleRemoveOption = (categoryIndex: number, optionIndex: number) => {
    if (labelCategories[categoryIndex].options.length > 1) {
      const newCategories = [...labelCategories];
      newCategories[categoryIndex].options.splice(optionIndex, 1);
      setLabelCategories(newCategories);
    }
  };

  const handleOptionChange = (
    categoryIndex: number,
    optionIndex: number,
    field: "name" | "description",
    value: string
  ) => {
    const newCategories = [...labelCategories];
    newCategories[categoryIndex].options[optionIndex][field] = value;
    setLabelCategories(newCategories);
  };

  const handleSubmit = () => {
    setError(null);

    try {
      // Parse the configuration text
      const config = parseConfigText(configText);

      // Basic validation
      if (!config.datasetDescription.trim()) {
        setError("Please include a dataset description");
        return;
      }

      if (config.labelCategories.length === 0) {
        setError("Please include at least one label category");
        return;
      }

      // Check if at least one category has options
      const hasValidCategory = config.labelCategories.some(
        (cat) => cat.options && cat.options.length > 0
      );

      if (!hasValidCategory) {
        setError(
          "Please include at least one label option for at least one category"
        );
        return;
      }

      onIntentCaptured(config);
    } catch (err) {
      setError("Failed to parse the configuration. Please check the format.");
      console.error("Parse error:", err);
    }
  };

  // Function to parse the configuration text into the expected structure
  const parseConfigText = (text: string): LabelingIntent => {
    // Initialize the result
    const result: LabelingIntent = {
      datasetDescription: "",
      labelCategories: [],
      generalGuidelines: "",
    };

    // Split by sections
    const sections = text.split(/^##\s+/m);

    // Process each section
    sections.forEach((section) => {
      const trimmedSection = section.trim();

      // Skip empty sections
      if (!trimmedSection) return;

      // Dataset Description
      if (trimmedSection.startsWith("Dataset Description")) {
        const content = trimmedSection
          .replace("Dataset Description", "")
          .trim();
        result.datasetDescription = content;
      }
      // Label Categories
      else if (trimmedSection.startsWith("Label Categories")) {
        // Further split by label type (### headings)
        const categoryTexts = trimmedSection.split(/^###\s+/m);

        // Skip the header
        categoryTexts.shift();

        categoryTexts.forEach((catText) => {
          if (!catText.trim()) return;

          // First line is the type
          const lines = catText
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line);
          if (lines.length === 0) return;

          const type = lines[0];
          let guideline = "";

          // Next lines until bullet points are the guideline
          let i = 1;
          while (i < lines.length && !lines[i].startsWith("-")) {
            if (guideline) guideline += "\n";
            guideline += lines[i];
            i++;
          }

          // Remaining bullet points are options
          const options: LabelOption[] = [];
          while (i < lines.length) {
            if (lines[i].startsWith("-")) {
              const optionParts = lines[i].substring(1).split(":");
              if (optionParts.length >= 2) {
                options.push({
                  name: optionParts[0].trim(),
                  description: optionParts.slice(1).join(":").trim(),
                });
              }
            }
            i++;
          }

          result.labelCategories.push({
            type,
            guideline,
            options,
          });
        });
      }
      // General Guidelines
      else if (trimmedSection.startsWith("General Guidelines")) {
        const content = trimmedSection.replace("General Guidelines", "").trim();
        result.generalGuidelines = content;
      }
    });

    return result;
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Define Your Labeling Goals</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Edit the template below to define your labeling instructions. Use
        Markdown formatting to structure your content.
      </p>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="config-text">Labeling Instructions</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Reset to default template
                setConfigText(`# Labeling Instructions Template

## Dataset Description
[REPLACE THIS WITH YOUR DATASET DESCRIPTION]
Examples:
- Customer support tickets that need to be categorized by issue type and urgency
- Product reviews that need sentiment analysis and feature identification
- News articles that need to be classified by topic and tone

## Label Categories
[YOU MUST ADD AT LEAST ONE LABEL CATEGORY]
[FOLLOW THE FORMAT BELOW FOR EACH CATEGORY]

### [Category Name, e.g. Urgency]
[CATEGORY DESCRIPTION, e.g. How quickly this item needs attention]

- [Option Name, e.g. High]: [Option Description, e.g. Requires immediate attention]
- [Option Name, e.g. Medium]: [Option Description, e.g. Should be addressed within 24 hours]
- [Option Name, e.g. Low]: [Option Description, e.g. Can be addressed when time permits]

### [Category Name, e.g. Issue Type]
[CATEGORY DESCRIPTION, e.g. The type of problem being reported]

- [Option Name, e.g. Technical]: [Option Description, e.g. Related to software bugs or technical issues]
- [Option Name, e.g. Billing]: [Option Description, e.g. Related to payments, charges, or account billing]
- [Option Name, e.g. Feature Request]: [Option Description, e.g. Suggestions for new features or improvements]

## General Guidelines
[ADD ANY GENERAL INSTRUCTIONS FOR LABELERS HERE]
Examples:
- If an item could belong to multiple categories, choose the most prominent one
- Label items based on explicit content, not assumptions about intent
- When uncertain between two options, choose the more specific one
- Consider the entire text before assigning labels, not just keywords
`);
              }}
              type="button"
              className="px-2 py-1 h-auto text-xs"
            >
              Reset to Template
            </Button>
          </div>

          <Textarea
            id="config-text"
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            rows={20}
            className="mt-1 font-mono text-sm"
            style={{ lineHeight: 1.5 }}
          />
          <p className="text-xs text-neutral-500 mt-2">
            <strong>Instructions:</strong> Replace the text in [BRACKETS] with
            your own content. Keep the markdown formatting (##, ###, -). Each
            label category must be under a Level 3 heading (###) and each option
            must be a bullet point (-) formatted as "- OptionName: Description".
            You can add as many categories and options as needed following the
            template format.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md text-sm flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 text-red-500"
            >
              <path
                fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}
      </div>
    </Card>
  );
});
