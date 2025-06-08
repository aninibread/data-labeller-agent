import React, { useState, useRef, useImperativeHandle } from "react";
import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import { Textarea } from "@/components/textarea/Textarea";
import { Label } from "@/components/label/Label";
import { Input } from "@/components/input/Input";

type ParsedData = {
  items: string[];
  source: "file" | "paste";
};

type DataUploaderProps = {
  onDataUploaded: (data: ParsedData) => void;
  ref?: React.RefObject<{
    handleContinue: () => void;
  }>;
};

export const DataUploader = React.forwardRef<
  { handleContinue: () => void },
  DataUploaderProps
>(({ onDataUploaded }, ref) => {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [pastedData, setPastedData] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expose the handleContinue method to the parent component
  useImperativeHandle(ref, () => ({
    handleContinue: () => {
      console.log("DataUploader handleContinue called, activeTab:", activeTab);
      if (activeTab === "paste") {
        console.log("Handling paste submit");
        handlePasteSubmit();
      } else {
        console.log("Triggering file input click");
        fileInputRef.current?.click();
      }
    },
  }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }

    setIsUploading(true);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim());

      // Very basic CSV parsing for MVP
      const items = lines
        .map((line) => {
          // Strip quotes if present and get first column only
          return line
            .replace(/^"(.*)"$/, "$1")
            .split(",")[0]
            .trim();
        })
        .filter((item) => item.length > 0);

      if (items.length < 1) {
        setError("No valid data found in CSV");
        return;
      }

      if (items.length > 100) {
        setError("Please limit to 100 items for MVP version");
        return;
      }

      onDataUploaded({
        items,
        source: "file",
      });
    } catch (err) {
      setError("Error parsing CSV file");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasteSubmit = () => {
    console.log(
      "handlePasteSubmit called, pastedData:",
      pastedData ? "has data" : "empty"
    );
    setError(null);

    if (!pastedData.trim()) {
      console.log("Error: No data entered");
      setError("Please enter some text data");
      return;
    }

    const items = pastedData
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    console.log("Parsed items:", items.length);

    if (items.length < 1) {
      console.log("Error: No valid items found");
      setError("No valid data found");
      return;
    }

    if (items.length > 100) {
      console.log("Error: Too many items");
      setError("Please limit to 100 items for MVP version");
      return;
    }

    console.log("Calling onDataUploaded with items:", items.length);
    onDataUploaded({
      items,
      source: "paste",
    });
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Upload Data for Labeling</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Upload a small batch of text data (5-100 items) that you want to label.
      </p>

      <div className="flex w-full border-b border-neutral-200 dark:border-neutral-700 mb-6">
        <button
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors w-1/2 flex items-center justify-center gap-2 ${
            activeTab === "file"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
          onClick={() => setActiveTab("file")}
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
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Upload CSV
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors w-1/2 flex items-center justify-center gap-2 ${
            activeTab === "paste"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
          onClick={() => setActiveTab("paste")}
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
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="M9 12h6" />
            <path d="M9 16h6" />
          </svg>
          Paste Text
        </button>
      </div>

      {activeTab === "file" ? (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm font-medium">
                {isUploading ? "Uploading..." : "Upload CSV File"}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Click to browse or drag and drop a CSV file
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Single column CSV with one text item per row
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex-1">
            <Label htmlFor="paste-data">
              Paste your text data (one item per line)
            </Label>
            <Textarea
              id="paste-data"
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              placeholder="Item 1&#10;Item 2&#10;Item 3"
              rows={8}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md text-sm">
          {error}
        </div>
      )}
    </Card>
  );
});
