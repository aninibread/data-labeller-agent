import { labelDataBatch, type DataItem } from "@/lib/labelingAgent";

// Define the API's expected LabelingIntent format
type ApiLabelingIntent = {
  datasetDescription: string;
  labelCategories: string[];
  guidelines: string;
};

/**
 * Handles the labeling request from the client
 */
export async function handleLabelingRequest(request: Request, env: any) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate required fields
    if (!body.data || !body.intent) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: data and intent",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Extract data and intent from the request
    const data: DataItem[] = body.data;
    const intent: ApiLabelingIntent = body.intent;

    // Validate data
    if (!Array.isArray(data) || data.length === 0 || data.length > 100) {
      return new Response(
        JSON.stringify({
          error: "Data must be an array with 1-100 items",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate intent
    if (
      !intent.datasetDescription ||
      !Array.isArray(intent.labelCategories) ||
      intent.labelCategories.length === 0
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Intent must include datasetDescription and at least one labelCategory",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Process the data with our labeling agent
    const batchSize = data.length <= 5 ? 1 : 5; // Use smaller batches for small datasets
    const result = await labelDataBatch(data, intent, env, batchSize);

    // Return the results
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing labeling request", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
