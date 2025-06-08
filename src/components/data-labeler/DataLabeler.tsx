import React, { useState, useRef, useEffect } from "react";
import { DataUploader } from "./DataUploader";
import { IntentCapture, type LabelingIntent } from "./IntentCapture";
import { DataReview } from "./DataReview";
// ProjectSelection removed as it's no longer needed
import { Card } from "@/components/card/Card";
import { Button } from "@/components/button/Button";
import { Input } from "@/components/input/Input";
import { Label } from "@/components/label/Label";
import { useLabelingService } from "@/hooks/useLabelingService";
import { useDataStorage } from "@/hooks/useDataStorage";
import type {
  DataItem as DataItemType,
  LabelResult,
} from "@/lib/labelingAgent";

type DataItem = {
  text: string;
  id: string;
};

type LabelingStep = "upload" | "intent" | "processing" | "review";

export function DataLabeler() {
  const uploaderRef = useRef<{ handleContinue: () => void }>(null);
  const intentRef = useRef<{ handleContinue: () => void }>(null);
  const [currentStep, setCurrentStep] = useState<LabelingStep>("upload");
  const [data, setData] = useState<DataItem[]>([]);
  const [intent, setIntent] = useState<LabelingIntent | null>(null);
  const [labelResults, setLabelResults] = useState<LabelResult[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const {
    labelData,
    updateLabel,
    exportToCsv,
    isProcessing,
    error: labelingError,
  } = useLabelingService();
  const {
    sessions: projects,
    loadSessions: loadProjects,
    startNewSession: startNewProject,
    saveResults,
    finishSession: finishProject,
    error: storageError,
    currentSession: currentProject,
  } = useDataStorage();

  const handleDataUploaded = (uploadedData: {
    items: string[];
    source: "file" | "paste";
  }) => {
    console.log(
      "handleDataUploaded called with items:",
      uploadedData.items.length
    );
    // Convert raw text items to data items with IDs
    const dataItems = uploadedData.items.map((text, index) => ({
      text,
      id: `item-${index}`,
    }));

    console.log("Setting data items:", dataItems.length);
    setData(dataItems);
    console.log("Moving to intent step");
    setCurrentStep("intent");
  };

  const handleIntentCaptured = async (capturedIntent: LabelingIntent) => {
    setIntent(capturedIntent);
    setCurrentStep("processing");

    try {
      // Create a new project in storage
      const defaultProjectName = `Project ${new Date().toLocaleDateString()}`;
      const project = startNewProject(defaultProjectName, data, capturedIntent);

      if (project) {
        setCurrentProjectId(project.id);
      }

      // Process the data with our labeling service
      const result = await labelData(data, capturedIntent);

      if (result) {
        setLabelResults(result.results);

        // Save results to storage if we have a project
        if (project) {
          saveResults(project.id, result.results);
        }
      }

      // Move to review step regardless of success/failure
      setCurrentStep("review");
    } catch (err) {
      console.error("Error in labeling process:", err);
      // Still move to review step to allow for error display
      setCurrentStep("review");
    }
  };

  // Handler for updating a label after human review
  const handleUpdateLabel = (itemId: string, newLabel: string) => {
    updateLabel(itemId, newLabel);

    // Update storage if we have a project
    if (currentProjectId && labelResults.length > 0) {
      // Find the updated result and update it
      const updatedResults = labelResults.map((result) =>
        result.itemId === itemId
          ? { ...result, label: newLabel, needsReview: false, confidence: 100 }
          : result
      );

      // Save to storage
      saveResults(currentProjectId, updatedResults);
    }
  };

  // Handler for exporting the labels
  const handleExport = () => {
    const csv = exportToCsv();

    // Mark project as completed if we have one
    if (currentProjectId) {
      finishProject(currentProjectId);
    }

    // Create a blob and download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `labeled_data_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Navigation functions
  const goToStep = (step: LabelingStep) => {
    // Don't allow skipping ahead past the current progress
    const stepOrder: LabelingStep[] = [
      "upload",
      "intent",
      "processing",
      "review",
    ];
    const currentIndex = stepOrder.indexOf(currentStep);
    const targetIndex = stepOrder.indexOf(step);

    // Special case - don't allow going back to processing step
    if (step === "processing") {
      return;
    }

    // Only allow navigation to steps we've already visited
    // or the next step in sequence
    if (targetIndex <= currentIndex || targetIndex === currentIndex + 1) {
      setCurrentStep(step);
    }
  };

  const goBack = () => {
    if (currentStep === "intent") {
      goToStep("upload");
    } else if (currentStep === "review") {
      goToStep("intent");
    }
    // We don't allow going back from processing
  };

  const goNext = () => {
    if (currentStep === "upload" && data.length > 0) {
      goToStep("intent");
    } else if (currentStep === "intent" && intent) {
      goToStep("processing");
    }
    // Processing automatically advances to review
  };

  // Export is now handled by the handleExport function defined above

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-6">AI-Assisted Data Labeling</h1>

      {/* Progress Steps */}
      <div className="flex justify-between mb-8">
        {["upload", "intent", "processing", "review"].map((step, index) => (
          <div
            key={step}
            className="flex flex-col items-center"
            onClick={() => goToStep(step as LabelingStep)}
            style={{ cursor: step !== "processing" ? "pointer" : "default" }}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === step
                  ? "bg-primary text-white"
                  : currentStep === "processing" && step === "review"
                    ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-400"
                    : index <=
                        ["upload", "intent", "processing", "review"].indexOf(
                          currentStep
                        )
                      ? "bg-green-500 text-white"
                      : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400"
              }`}
            >
              {index + 1}
            </div>
            <span className="text-sm mt-2 capitalize">{step}</span>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[400px]">
        {" "}
        {/* Fixed height to maintain consistent button positioning */}
        {currentStep === "upload" && (
          <>
            <DataUploader
              ref={uploaderRef}
              onDataUploaded={handleDataUploaded}
            />
          </>
        )}
        {currentStep === "intent" && (
          <IntentCapture
            ref={intentRef}
            onIntentCaptured={handleIntentCaptured}
          />
        )}
        {currentStep === "processing" && (
          <Card className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Processing Your Data</h2>
            <p className="mb-6">
              The AI is analyzing and labeling your data...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          </Card>
        )}
        {currentStep === "review" && (
          <>
            {labelingError || storageError ? (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-red-600">
                  Error Processing Data
                </h2>
                <p className="text-sm text-red-600 mb-6">
                  {labelingError || storageError}
                </p>
                <p className="text-sm">
                  Please go back and try again with different data or settings.
                </p>
              </Card>
            ) : labelResults.length > 0 ? (
              <DataReview
                results={labelResults}
                labelCategories={intent?.labelCategories || []}
                projectName={currentProject?.name || "Current Project"}
                projectId={currentProjectId || undefined}
                onUpdateLabel={handleUpdateLabel}
                onExport={handleExport}
                dataItems={data}
              />
            ) : (
              <Card className="p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">
                    No Results Available
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Project: {currentProject?.name || "Current Project"}
                  </p>
                  {currentProjectId && (
                    <p className="text-xs text-neutral-400">
                      ID: {currentProjectId}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  No labeled data is available for review. This might be due to
                  an error in processing.
                </p>
                <div className="space-y-4">
                  <p>Data items: {data.length}</p>
                  <p>Dataset description: {intent?.datasetDescription}</p>
                  <p>
                    Label types:{" "}
                    {intent?.labelCategories.map((cat) => cat.type).join(", ")}
                  </p>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Navigation Controls - Fixed Position at Bottom */}
      <div className="flex justify-between mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        {/* Back Button - Only show on intent and review steps */}
        {currentStep !== "upload" && currentStep !== "processing" ? (
          <Button variant="outline" onClick={goBack}>
            Back
          </Button>
        ) : (
          <div></div> /* Empty div to maintain layout */
        )}

        {/* Continue/Export Button */}
        {currentStep !== "processing" ? (
          <Button
            onClick={() => {
              // Handle the current step
              if (currentStep === "upload") {
                // For upload step, call the uploader's handleContinue method
                uploaderRef.current?.handleContinue();
              } else if (currentStep === "intent") {
                // For intent step, call the intent capture's handleContinue method
                intentRef.current?.handleContinue();
              } else if (currentStep === "review") {
                // For Review step, export labels
                handleExport();
              }
            }}
          >
            {currentStep === "review" ? "Export Labels" : "Continue"}
          </Button>
        ) : (
          <div></div> /* Empty div to maintain layout */
        )}
      </div>
    </div>
  );
}
