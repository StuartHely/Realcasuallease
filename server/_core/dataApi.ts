/**
 * Data API client - previously routed through Forge.
 * Now stubbed with warnings as direct API integration is not configured.
 * 
 * To implement direct API calls:
 * - For YouTube API: Use Google's official API with your own API key
 * - For other services: Implement direct HTTP calls to respective APIs
 */

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

/**
 * Calls an external data API.
 * Currently stubbed - logs a warning as the service is not configured.
 * 
 * @param apiId - The API identifier (e.g., "Youtube/search")
 * @param options - Query parameters, body, path params, or form data
 * @returns Empty object as service is not configured
 */
export async function callDataApi(
  apiId: string,
  options: DataApiCallOptions = {}
): Promise<unknown> {
  console.warn(
    `[DataApi] Service not configured. API call not made:`,
    { apiId, options }
  );

  return {};
}
