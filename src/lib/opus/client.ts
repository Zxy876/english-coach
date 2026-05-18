// Centralized LLM wrapper. Every Opus call in the app goes through here so we
// get uniform logging, a single place to tune max_tokens, and a retry helper
// for JSON-output prompts. Per Tech Spec §8.

import type { z } from "zod";
import type { LlmProvider, MessageParam } from "./provider";
import { createGeminiProvider, GEMINI_DEFAULT_MODEL } from "./providers/gemini";

const DEFAULT_PROVIDER = "gemini";

// Lazy-init so importing this module doesn't throw when the provider key is
// absent (e.g. in unit tests that mock the wrapper).
let _provider: LlmProvider | null = null;
function provider(): LlmProvider {
  if (_provider) return _provider;

  const selected = process.env.LLM_PROVIDER?.trim().toLowerCase() || DEFAULT_PROVIDER;
  switch (selected) {
    case "gemini":
      _provider = createGeminiProvider();
      return _provider;
    default:
      throw new Error(`Unsupported LLM_PROVIDER: ${selected}`);
  }
}

export interface CallOpusArgs {
  promptName: string;
  system: string;
  messages: MessageParam[];
  maxTokens?: number;
  expectJson?: boolean;
}

function log(record: Record<string, unknown>) {
  console.log(JSON.stringify({ src: "opus", ...record }));
}

function stripFences(s: string): string {
  return s
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

export async function callOpus(args: CallOpusArgs): Promise<string> {
  const start = Date.now();
  const activeProvider = provider();
  const res = await activeProvider.call({
    system: args.system,
    messages: args.messages,
    maxTokens: args.maxTokens,
    expectJson: args.expectJson,
  });
  const durationMs = Date.now() - start;
  log({
    prompt: args.promptName,
    provider: activeProvider.name,
    model: activeProvider.model,
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
    durationMs,
    stopReason: res.stopReason,
  });
  return args.expectJson ? stripFences(res.text) : res.text;
}

export async function* streamOpus(args: {
  promptName: string;
  system: string;
  messages: MessageParam[];
  maxTokens?: number;
}): AsyncGenerator<string> {
  const start = Date.now();
  const activeProvider = provider();
  const result = await activeProvider.stream({
    system: args.system,
    messages: args.messages,
    maxTokens: args.maxTokens,
    expectJson: false,
  });
  for await (const chunk of result.stream) {
    yield chunk;
  }
  const usage = await result.done;
  log({
    prompt: args.promptName,
    provider: activeProvider.name,
    model: activeProvider.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    durationMs: Date.now() - start,
    stopReason: usage.stopReason,
    streamed: true,
  });
}

// Calls Opus expecting a JSON response, parses against the supplied Zod
// schema, and on validation failure retries once with a corrective follow-up
// message. Throws on second failure with a descriptive error.
export async function callOpusAndParse<T>(
  args: CallOpusArgs & { schema: z.ZodType<T> },
): Promise<T> {
  const raw = await callOpus({ ...args, expectJson: true });
  const first = args.schema.safeParse(safeJson(raw));
  if (first.success) return first.data;

  const errorSummary = summarizeZodIssues(first.error.issues);
  log({
    prompt: args.promptName,
    event: "zod_validation_retry",
    errorSummary,
  });

  const correctiveMessages: MessageParam[] = [
    ...args.messages,
    { role: "assistant", content: raw },
    {
      role: "user",
      content: `Your previous output failed validation: ${errorSummary}\n\nPlease output valid JSON per the schema, with no preamble or code fences.`,
    },
  ];
  const retryRaw = await callOpus({
    ...args,
    messages: correctiveMessages,
    promptName: `${args.promptName}:retry`,
    expectJson: true,
  });
  const second = args.schema.safeParse(safeJson(retryRaw));
  if (second.success) return second.data;

  const secondSummary = summarizeZodIssues(second.error.issues);
  throw new Error(
    `Opus prompt "${args.promptName}" produced invalid JSON twice.\n` +
      `First failure: ${errorSummary}\n` +
      `Second failure: ${secondSummary}\n` +
      `Second raw output (first 500 chars): ${retryRaw.slice(0, 500)}`,
  );
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (err) {
    return { __parseError: err instanceof Error ? err.message : String(err), raw };
  }
}

function summarizeZodIssues(issues: z.core.$ZodIssue[]): string {
  return issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
    .join("; ");
}

export const MODEL = process.env.LLM_MODEL?.trim() || GEMINI_DEFAULT_MODEL;
