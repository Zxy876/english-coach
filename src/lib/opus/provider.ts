export type MessageParam = {
  role: "user" | "assistant";
  content: string;
};

export interface ProviderCallArgs {
  system: string;
  messages: MessageParam[];
  maxTokens?: number;
  expectJson?: boolean;
}

export interface ProviderCallResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  stopReason?: string | null;
}

export interface ProviderStreamResult {
  stream: AsyncIterable<string>;
  done: Promise<{
    inputTokens?: number;
    outputTokens?: number;
    stopReason?: string | null;
  }>;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  call(args: ProviderCallArgs): Promise<ProviderCallResult>;
  stream(args: ProviderCallArgs): Promise<ProviderStreamResult>;
}
