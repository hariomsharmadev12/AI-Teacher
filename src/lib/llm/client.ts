// Thin wrapper around the Google Gemini API using structured outputs
// (JSON Schema mode), so responses match the provided schema.

export const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

export class LLMConfigError extends Error {}

export class LLMRequestError extends Error {
  status?: number;
  body?: unknown;
  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface StructuredCallArgs {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}

// Helper to convert standard JSON schema to Gemini's expected format
function formatGeminiSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;

  if (Array.isArray(schema)) {
    return schema.map(formatGeminiSchema);
  }
  
  const converted: any = {};
  for (const key in schema) {
    // Gemini API rejects the additionalProperties key, so we strip it out
    if (key === "additionalProperties") {
      continue;
    }
    
    // Gemini requires schema types to be uppercase strings
    if (key === "type" && typeof schema[key] === "string") {
      converted[key] = schema[key].toUpperCase();
    } else {
      converted[key] = formatGeminiSchema(schema[key]);
    }
  }
  
  return converted;
}

/**
 * Calls Gemini with a JSON-Schema-constrained output format and returns the
 * parsed object, typed as T by the caller.
 */
export async function callGeminiForJSON<T>({
  system,
  user,
  schema,
  maxTokens = 4096,
}: StructuredCallArgs): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new LLMConfigError(
      "GEMINI_API_KEY is not set. Add GEMINI_API_KEY to your .env.local file."
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: user }],
        },
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.2, // Prevents repetitive token looping
        responseMimeType: "application/json",
        responseSchema: formatGeminiSchema(schema),
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new LLMRequestError(`Gemini API request failed (${res.status})`, res.status, body);
  }

  const data = await res.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new LLMRequestError("Gemini API response had no text content", res.status, data);
  }

  try {
    return JSON.parse(textContent) as T;
  } catch {
    throw new LLMRequestError("Gemini API returned invalid JSON", res.status, textContent);
  }
}

// Alias to prevent breaking existing imports in your project
export const callClaudeForJSON = callGeminiForJSON;