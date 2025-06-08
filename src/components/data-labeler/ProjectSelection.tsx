import React, { useState, useEffect } from "react";
import { Card } from "@/components/card/Card";
import { Label } from "@/components/label/Label";
import { Input } from "@/components/input/Input";
import { Button } from "@/components/button/Button";

type ProjectSelectionProps = {
  projects: Array<{
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    status?: "in_progress" | "completed";
  }>;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onCreateNewProject: () => void;
  onSelectProject: (projectId: string) => void;
};

export const ProjectSelection = React.forwardRef<
  { handleContinue: () => void },
  ProjectSelectionProps
>(
  (
    {
      projects,
      projectName,
      onProjectNameChange,
      onCreateNewProject,
      onSelectProject,
    },
    ref
  ) => {
    const [selectedOption, setSelectedOption] = useState<"new" | "existing">(
      "new"
    );

    // Expose handleContinue method to parent
    React.useImperativeHandle(ref, () => ({
      handleContinue: () => {
        if (selectedOption === "new") {
          onCreateNewProject();
        } else if (selectedOption === "existing" && selectedProjectId) {
          onSelectProject(selectedProjectId);
        }
      },
    }));

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
      null
    );

    // Sort projects by date (most recent first)
    const sortedProjects = [...projects].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          Select a Labeling Project
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Create a new labeling project or continue working on an existing one.
        </p>

        <div className="space-y-6">
          <div className="flex w-full border-b border-neutral-200 dark:border-neutral-700 mb-6">
            <button
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors w-1/2 flex items-center justify-center gap-2 ${
                selectedOption === "new"
                  ? "border-primary text-primary"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
              onClick={() => setSelectedOption("new")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Create New Project
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors w-1/2 flex items-center justify-center gap-2 ${
                selectedOption === "existing"
                  ? "border-primary text-primary"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
              onClick={() => setSelectedOption("existing")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              Existing Projects
            </button>
          </div>

          {selectedOption === "new" ? (
            <div>
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => onProjectNameChange(e.target.value)}
                placeholder="Enter a name for your labeling project"
                className="mt-1"
              />
              <p className="text-xs text-neutral-500 mt-1">
                This name will help you identify your project later.
              </p>
            </div>
          ) : (
            <div>
              {sortedProjects.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-neutral-500">
                    No existing projects found.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setSelectedOption("new")}
                  >
                    Create Your First Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {sortedProjects.map((project) => (
                    <div
                      key={project.id}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedProjectId === project.id
                          ? "border-primary bg-primary/5"
                          : "border-neutral-200 dark:border-neutral-700 hover:border-primary"
                      }`}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{project.name}</h4>
                          <p className="text-xs text-neutral-500">
                            Last updated:{" "}
                            {new Date(project.updatedAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              project.status === "completed"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                            }`}
                          >
                            {project.status === "completed"
                              ? "Completed"
                              : "In Progress"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }
);

ProjectSelection.displayName = "ProjectSelection";
