import Anthropic from "@anthropic-ai/sdk";
import {
  Classification,
  GenerateOptions,
  SummarizeOptions,
  TokenUsage,
} from "../types";
import { BaseProvider, ProviderConfig } from "./base-provider";

export class AnthropicProvider extends BaseProvider {
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    this.validateApiKey();

    this.client = new Anthropic({
      apiKey: this.config.apiKey!,
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries || 2,
    });
  }

  protected getDefaultModel(): string {
    return "claude-3-sonnet-20240229";
  }

  /**
   * Generate text completion
   */
  override async generateText(
    prompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    const model = this.getModel(options as { model?: string });

    const response = await this.client.messages.create({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      system: options?.systemPrompt,
      max_tokens: options?.maxTokens || 1000,
      temperature: options?.temperature,
      top_p: options?.topP,
      top_k: options?.topK,
      stop_sequences: options?.stopSequences,
      stream: false,
    });

    // Extract text from content blocks
    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as any).text)
      .join("\n");

    return content;
  }

  /**
   * Generate streaming text completion
   */
  override async *generateStream(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const model = this.getModel(options as { model?: string });

    const stream = await this.client.messages.create({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      system: options?.systemPrompt,
      max_tokens: options?.maxTokens || 1000,
      temperature: options?.temperature,
      top_p: options?.topP,
      top_k: options?.topK,
      stop_sequences: options?.stopSequences,
      stream: true,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }

  /**
   * Classify text
   */
  override async classifyText(
    text: string,
    labels: string[]
  ): Promise<Classification> {
    const prompt = `Classify this text into exactly one category from: ${labels.join(", ")}.

Text: "${text}"

Respond with a JSON object:
{
  "label": "chosen category",
  "confidence": 0.0-1.0,
  "scores": { "category1": 0.0-1.0, ... }
}`;

    const response = await this.generateText(prompt, {
      temperature: 0,
      maxTokens: 200,
    });

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback parsing
    }

    // Fallback response
    const label = labels[0] ?? "";
    return {
      label,
      confidence: 0.5,
      scores: labels.reduce(
        (acc, l) => ({
          ...acc,
          [l]: l === label ? 0.5 : 0.5 / (labels.length - 1),
        }),
        {}
      ),
    };
  }

  /**
   * Summarize text
   */
  override async summarize(
    text: string,
    options?: SummarizeOptions
  ): Promise<string> {
    const instructions = {
      bullet: "Create a bullet-point summary with key points",
      paragraph: "Write a concise paragraph summary",
      tldr: "Write a one-sentence TL;DR",
      "key-points": "Extract the most important key points",
      executive: "Write an executive summary for business leaders",
    };

    const prompt = `${instructions[options?.style || "paragraph"]} of the following text.
${options?.maxLength ? `Keep it under ${options.maxLength} characters.` : ""}

Text:
"${text}"

Summary:`;

    return this.generateText(prompt, {
      maxTokens: options?.maxLength ? Math.ceil(options.maxLength / 4) : 200,
      temperature: 0.3,
    });
  }

  /**
   * Analyze sentiment
   */
  override async analyzeSentiment(text: string): Promise<any> {
    const prompt = `Analyze the sentiment of the following text. Respond with JSON:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "score": 0.0-1.0,
  "aspects": [
    { "aspect": "...", "sentiment": "...", "score": 0.0-1.0 }
  ]
}

Text: "${text}"`;

    const response = await this.generateText(prompt, {
      temperature: 0,
      maxTokens: 300,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback
    }

    return {
      sentiment: "neutral",
      score: 0.5,
      aspects: [],
    };
  }

  /**
   * Generate embeddings (not supported by Anthropic)
   */
  override async generateEmbedding(text: string): Promise<number[]> {
    throw new Error(
      "Embeddings not supported by Anthropic. Use a different provider."
    );
  }

  /**
   * Generate code
   */
  override async generateCode(prompt: string, options?: any): Promise<any> {
    const systemPrompt = `You are Claude, an expert programmer. Generate clean, efficient code.
${options?.includeComments ? "Include helpful comments." : ""}
${options?.includeTests ? "Include unit tests." : ""}
Always respond with valid JSON containing: code, language, explanation, and dependencies array.`;

    const fullPrompt = `Language: ${options?.language || "auto-detect"}
Framework: ${options?.framework || "none"}

Task: ${prompt}

Respond with JSON:
{
  "code": "the generated code",
  "language": "detected or specified language",
  "explanation": "brief explanation",
  ${options?.includeTests ? '"tests": "unit test code",' : ""}
  "dependencies": ["required", "packages"]
}`;

    const response = await this.generateText(fullPrompt, {
      systemPrompt,
      temperature: 0.2,
      maxTokens: 2000,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback
    }

    return {
      code: response,
      language: options?.language || "unknown",
      explanation: "Generated code",
      dependencies: [],
    };
  }

  /**
   * Explain code
   */
  override async explainCode(code: string, language?: string): Promise<string> {
    const prompt = `Explain this ${language || "code"} in detail:

\`\`\`${language || ""}
${code}
\`\`\`

Explain:
1. What it does
2. How it works
3. Key concepts/patterns
4. Potential improvements`;

    return this.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 1000,
    });
  }

  /**
   * Extract token usage from response
   */
  private extractTokenUsage(usage: any): TokenUsage {
    return {
      promptTokens: usage?.input_tokens || 0,
      completionTokens: usage?.output_tokens || 0,
      totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
    };
  }
}
