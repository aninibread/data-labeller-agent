import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/card/Card";
import { Button } from "@/components/button/Button";
import { useDataStorage } from "@/hooks/useDataStorage";

export function ProjectsList() {
  const {
    sessions: projects,
    loadSessions: loadProjects,
    loadSession: loadProject,
    removeSession: removeProject,
  } = useDataStorage();
  const navigate = useNavigate();

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Handler for continuing a project
  const handleContinueProject = (projectId: string) => {
    const project = loadProject(projectId);

    if (project) {
      // In a real app, we would load the project state and continue from where we left off
      // For now, we'll just navigate to the review page
      navigate(`/data-labeler/project/${projectId}`);
    }
  };

  // Handler for deleting a project
  const handleDeleteProject = (projectId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      removeProject(projectId);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Labeling Projects</h1>
        <Button onClick={() => navigate("/data-labeler")}>New Project</Button>
      </div>

      {sessions.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-lg mb-4">
            You don't have any labeling projects yet.
          </p>
          <p className="text-sm text-neutral-500 mb-6">
            Create a new project to start labeling your data.
          </p>
          <Button onClick={() => navigate("/data-labeler")}>
            Create Your First Project
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">{project.name}</h2>
                  <div className="text-sm text-neutral-500">
                    Created: {formatDate(project.createdAt)}
                  </div>
                  <div className="text-sm text-neutral-500">
                    Last updated: {formatDate(project.updatedAt)}
                  </div>
                  <div className="text-sm mt-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleContinueProject(project.id)}
                  >
                    {project.status === "completed" ? "View" : "Continue"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
