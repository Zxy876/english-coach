import {
  GoogleGenerativeAI,
  type Content,
  type GenerateContentResponse,
} from "@google/generative-ai";
import type {
  LlmProvider,
  MessageParam,
  ProviderCallArgs,
  ProviderCallResult,
  ProviderStreamResult,
} from "../provider";

export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_DEFAULT_TIMEOUT_MS = 90_000;
const GEMINI_DEFAULT_MAX_RETRIES = 3;

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function toContents(messages: MessageParam[]): Content[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

function usageFromResponse(response: GenerateContentResponse) {
  return {
    inputTokens: response.usageMetadata?.promptTokenCount,
    outputTokens: response.usageMetadata?.candidatesTokenCount,
    stopReason: response.candidates?.[0]?.finishReason ?? null,
  };
}

function generationConfig(args: ProviderCallArgs) {
  return {
    maxOutputTokens: Math.max(args.maxTokens ?? 4096, args.expectJson ? 8192 : 2048),
    temperature: args.expectJson ? 0 : undefined,
    responseMimeType: args.expectJson ? "application/json" : "text/plain",
  };
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed > 0 ? Math.floor(parsed) : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableGeminiError(err: unknown): boolean {
  const status =
    typeof err === "object" && err && "status" in err && typeof err.status === "number"
      ? err.status
      : null;
  if (status && [408, 429, 500, 502, 503, 504].includes(status)) return true;

  const message = err instanceof Error ? err.message.toLowerCase() : "";
  return (
    message.includes("fetch failed") ||
    message.includes("service unavailable") ||
    message.includes("too many requests") ||
    message.includes("operation was aborted") ||
    message.includes("request aborted") ||
    message.includes("aborted") ||
    message.includes("timed out") ||
    message.includes("econnreset") ||
    message.includes("socket hang up")
  );
}

async function withRetry<T>(
  op: () => Promise<T>,
  options: { maxRetries: number; baseDelayMs: number }
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < options.maxRetries) {
    try {
      return await op();
    } catch (err) {
      lastError = err;
      attempt += 1;

      if (attempt >= options.maxRetries || !isRetriableGeminiError(err)) {
        break;
      }

      const jitter = Math.floor(Math.random() * 120);
      const delay = options.baseDelayMs * 2 ** (attempt - 1) + jitter;
      await sleep(delay);
    }
  }

  throw lastError;
}

class GeminiProvider implements LlmProvider {
  readonly name = "gemini";
  readonly model: string;

  private readonly client: GoogleGenerativeAI;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor() {
    this.client = new GoogleGenerativeAI(env("GEMINI_API_KEY"));
    this.model = process.env.LLM_MODEL?.trim() || GEMINI_DEFAULT_MODEL;
    this.timeoutMs = parsePositiveInt(process.env.GEMINI_TIMEOUT_MS, GEMINI_DEFAULT_TIMEOUT_MS);
    this.maxRetries = parsePositiveInt(process.env.GEMINI_MAX_RETRIES, GEMINI_DEFAULT_MAX_RETRIES);
  }

  async call(args: ProviderCallArgs): Promise<ProviderCallResult> {
    const model = this.client.getGenerativeModel({ model: this.model });
    const result = await withRetry(async () => {
      return model.generateContent(
        {
          systemInstruction: args.system,
          contents: toContents(args.messages),
          generationConfig: generationConfig(args),
        },
        { timeout: this.timeoutMs }
      );
    }, { maxRetries: this.maxRetries, baseDelayMs: 300 });
    const response = await result.response;
    return {
      text: response.text(),
      ...usageFromResponse(response),
    };
  }

  async stream(args: ProviderCallArgs): Promise<ProviderStreamResult> {
    const model = this.client.getGenerativeModel({ model: this.model });
    const result = await withRetry(async () => {
      return model.generateContentStream(
        {
          systemInstruction: args.system,
          contents: toContents(args.messages),
          generationConfig: generationConfig(args),
        },
        { timeout: this.timeoutMs }
      );
    }, { maxRetries: this.maxRetries, baseDelayMs: 300 });

    return {
      stream: (async function* () {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) yield text;
        }
      })(),
      done: result.response.then((response) => usageFromResponse(response)),
    };
  }
}

export function createGeminiProvider(): LlmProvider {
  return new GeminiProvider();
}
