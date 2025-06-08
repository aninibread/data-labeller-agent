import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/card/Card";
import { Button } from "@/components/button/Button";
import { DataReview } from "./DataReview";
import { useDataStorage } from "@/hooks/useDataStorage";

export function ProjectViewer() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    currentSession: currentProject,
    loadSession: loadProject,
    saveResults,
  } = useDataStorage();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      const project = loadProject(projectId);
      if (!project) {
        setError(`Project ${projectId} not found`);
      }
    }
  }, [projectId]);

  // Handler for updating a label
  const handleUpdateLabel = (itemId: string, newLabel: string) => {
    if (!currentProject) return;

    // Find the updated result and update it
    const updatedResults = currentProject.results.map((result) =>
      result.itemId === itemId
        ? { ...result, label: newLabel, needsReview: false, confidence: 100 }
        : result
    );

    // Save to storage
    saveResults(currentProject.id, updatedResults);
  };

  // Handler for exporting the project
  const handleExport = () => {
    if (!currentProject) return;

    // Create CSV content
    const header = "Text,Label,Confidence,Reasoning,NeedsReview\n";
    const rows = currentProject.results
      .map((result) => {
        const text = `"${result.itemId}"`;

        return [
          text,
          `"${result.label}"`,
          result.confidence,
          `"${result.reasoning.replace(/"/g, '""')}"`,
          result.needsReview ? "Yes" : "No",
        ].join(",");
      })
      .join("\n");

    const csv = header + rows;

    // Create a blob and download link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentProject.name.replace(/\s+/g, "_")}_labeled_data.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <Card className="p-6">
          <h1 className="text-xl font-semibold mb-4 text-red-600">Error</h1>
          <p className="text-sm text-red-600 mb-6">{error}</p>
          <Button onClick={() => navigate("/data-labeler/projects")}>
            Return to Projects
          </Button>
        </Card>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <Card className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading project...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{currentProject.name}</h1>
          <p className="text-sm text-neutral-500">
            Created: {new Date(currentProject.createdAt).toLocaleString()}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/data-labeler/projects")}
        >
          Back to Projects
        </Button>
      </div>

      <div className="mb-6">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">Dataset Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Dataset Description</p>
              <p className="text-sm text-neutral-500">
                {currentProject.intent.datasetDescription}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Label Categories</p>
              <p className="text-sm text-neutral-500">
                {currentProject.intent.labelCategories.join(", ")}
              </p>
            </div>
            {currentProject.intent.guidelines && (
              <div className="col-span-2">
                <p className="text-sm font-medium">Labeling Guidelines</p>
                <p className="text-sm text-neutral-500">
                  {currentProject.intent.guidelines}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <DataReview
        results={currentProject.results}
        labelCategories={currentProject.intent.labelCategories}
        onUpdateLabel={handleUpdateLabel}
        onExport={handleExport}
      />
    </div>
  );
}
