import { useState } from "react";
import { Card } from "@/components/card/Card";
import { Label } from "@/components/label/Label";
import { Button } from "@/components/button/Button";
import { Input } from "@/components/input/Input";
import type { LabelResult } from "@/lib/labelingAgent";

import type { LabelCategory, LabelOption } from "./IntentCapture";

type DataReviewProps = {
  results: LabelResult[];
  labelCategories: LabelCategory[];
  projectName: string;
  projectId?: string;
  onUpdateLabel: (itemId: string, newLabel: string) => void;
  onExport: () => void;
  // Include original data items
  dataItems?: Array<{ id: string; text: string }>;
};

export function DataReview({
  results,
  labelCategories,
  projectName,
  projectId,
  onUpdateLabel,
  onExport,
  dataItems = [],
}: DataReviewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "review">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Group results by item ID to handle multiple labels per item
  const groupedResults = results.reduce<Record<string, LabelResult[]>>(
    (acc, result) => {
      if (!acc[result.itemId]) {
        acc[result.itemId] = [];
      }
      acc[result.itemId].push(result);
      return acc;
    },
    {}
  );

  // Flatten the results again but now ensuring we have one card per label
  const flattenedResults = Object.entries(groupedResults).flatMap(
    ([itemId, itemResults]) => {
      // If there's only one result for this item, return it as is
      if (itemResults.length === 1) {
        return itemResults;
      }

      // Otherwise, create a separate result for each label
      return itemResults.map((result) => ({
        ...result,
        // Create a unique ID that combines the item ID and label
        uniqueCardId: `${result.itemId}_${result.label.replace(/\s+/g, "_")}`,
      }));
    }
  );

  // Filter results based on active tab and search term
  const filteredResults = flattenedResults.filter((result) => {
    // First filter by tab
    if (activeTab === "review" && !result.needsReview) {
      return false;
    }

    // Then filter by search term if present
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      const itemText =
        dataItems.find((item) => item.id === result.itemId)?.text || "";

      return (
        result.itemId.toLowerCase().includes(lowerSearch) ||
        result.label.toLowerCase().includes(lowerSearch) ||
        result.reasoning.toLowerCase().includes(lowerSearch) ||
        itemText.toLowerCase().includes(lowerSearch)
      );
    }

    return true;
  });

  // Stats for the review
  const needsReviewCount = results.filter((r) => r.needsReview).length;
  const lowConfidenceCount = results.filter((r) => r.confidence < 70).length;
  const reviewedCount = results.filter((r) => !r.needsReview).length;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-xl font-semibold">Review and Edit Labels</h2>
          <p className="text-sm text-neutral-500">Project: {projectName}</p>
          {projectId && (
            <p className="text-xs text-neutral-400">ID: {projectId}</p>
          )}
        </div>
        <Button variant="outline" onClick={onExport}>
          Export Labels
        </Button>
      </div>

      {/* Stats Display */}
      <div className="grid grid-cols-3 gap-4 mt-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {results.length}
          </div>
          <div className="text-sm text-green-800 dark:text-green-300">
            Total Items
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {reviewedCount}
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-300">
            Reviewed
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {needsReviewCount}
          </div>
          <div className="text-sm text-amber-800 dark:text-amber-300">
            Needs Review
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
          onClick={() => setActiveTab("all")}
        >
          All Items ({results.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "review"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
          onClick={() => setActiveTab("review")}
        >
          Needs Review ({needsReviewCount})
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <Input
          placeholder="Search labels or text..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Results List */}
      {filteredResults.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          {searchTerm ? "No matching items found" : "No items to display"}
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {filteredResults.map((result) => (
            <LabelCard
              key={(result as any).uniqueCardId || result.itemId}
              result={result}
              labelCategories={labelCategories}
              onUpdateLabel={onUpdateLabel}
              itemText={
                dataItems.find((item) => item.id === result.itemId)?.text
              }
              totalLabelsForItem={groupedResults[result.itemId]?.length || 1}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

type LabelCardProps = {
  result: LabelResult;
  labelCategories: LabelCategory[];
  onUpdateLabel: (itemId: string, newLabel: string) => void;
  // Add the data item text
  itemText?: string;
  // Track how many labels this item has
  totalLabelsForItem?: number;
};

function LabelCard({
  result,
  labelCategories,
  onUpdateLabel,
  itemText,
  totalLabelsForItem = 1,
}: LabelCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(result.label);

  const handleSave = () => {
    onUpdateLabel(result.itemId, selectedLabel);
    setIsEditing(false);
  };

  // Determine card styles based on confidence
  const cardClasses = result.needsReview
    ? "border-l-4 border-l-amber-500"
    : "border-l-4 border-l-green-500";

  // Format confidence for display
  const confidenceDisplay = `${Math.round(result.confidence)}%`;

  // Determine confidence color
  const confidenceColor =
    result.confidence >= 90
      ? "text-green-600 dark:text-green-400"
      : result.confidence >= 70
        ? "text-blue-600 dark:text-blue-400"
        : result.confidence >= 50
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";

  return (
    <div
      className={`bg-white dark:bg-neutral-800 rounded-md shadow-sm p-4 ${cardClasses}`}
    >
      {/* Item ID and Label Info */}
      <div className="flex justify-between text-xs text-neutral-500 mb-2">
        <div>ID: {result.itemId}</div>
        {totalLabelsForItem > 1 && (
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
            {totalLabelsForItem} labels
          </div>
        )}
      </div>

      {/* Text Content */}
      <div className="text-sm mb-3 break-words p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md">
        {itemText || "[No text content available]"}
      </div>

      {/* Label & Confidence */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs uppercase font-semibold">Label</Label>
          {isEditing ? (
            <select
              value={selectedLabel}
              onChange={(e) => setSelectedLabel(e.target.value)}
              className="text-sm py-1 px-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            >
              {labelCategories.flatMap((category) =>
                category.options.map((option) => (
                  <option
                    key={`${category.type}-${option.name}`}
                    value={`${category.type}: ${option.name}`}
                  >
                    {category.type}: {option.name}
                  </option>
                ))
              )}
            </select>
          ) : (
            <span className="text-sm font-medium px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded">
              {result.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Label className="text-xs uppercase font-semibold">Confidence</Label>
          <span className={`text-sm font-bold ${confidenceColor}`}>
            {confidenceDisplay}
          </span>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-3">
        <Label className="text-xs uppercase font-semibold block mb-1">
          Reasoning
        </Label>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900 p-2 rounded">
          {result.reasoning}
        </p>
      </div>

      {/* Uncertainty Explanation (if present) */}
      {result.uncertaintyExplanation && (
        <div className="mb-3">
          <Label className="text-xs uppercase font-semibold block mb-1">
            Uncertainty
          </Label>
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
            {result.uncertaintyExplanation}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 mt-3">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleSave}>
              Save
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            {result.needsReview ? "Review" : "Edit"}
          </Button>
        )}
      </div>
    </div>
  );
}
