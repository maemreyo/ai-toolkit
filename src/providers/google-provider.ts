import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  Classification,
  GenerateOptions,
  ImageAnalysis,
  ImageAnalysisOptions,
  SummarizeOptions,
} from "../types";
import { BaseProvider, ProviderConfig } from "./base-provider";

export class GoogleProvider extends BaseProvider {
  private client: GoogleGenerativeAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.validateApiKey();

    this.client = new GoogleGenerativeAI(this.config.apiKey!);
  }

  protected getDefaultModel(): string {
    return "gemini-pro";
  }

  /**
   * Generate text completion
   */
  override async generateText(
    prompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    const modelName = this.getModel(options as { model?: string });
    const model = this.client.getGenerativeModel({ model: modelName });

    // Configure generation settings
    const generationConfig = {
      maxOutputTokens: options?.maxTokens || 1000,
      temperature: options?.temperature || 0.7,
      topP: options?.topP || 0.95,
      topK: options?.topK || 40,
      stopSequences: options?.stopSequences,
    };

    // Build prompt with system message if provided
    const fullPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig,
    });

    const response = await result.response;
    return response.text();
  }

  /**
   * Generate streaming text completion
   */
  override async *generateStream(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const modelName = this.getModel(options as { model?: string });
    const model = this.client.getGenerativeModel({ model: modelName });

    const generationConfig = {
      maxOutputTokens: options?.maxTokens || 1000,
      temperature: options?.temperature || 0.7,
      topP: options?.topP || 0.95,
      topK: options?.topK || 40,
      stopSequences: options?.stopSequences,
    };

    const fullPrompt = options?.systemPrompt
      ? `${options.systemPrompt}\n\n${prompt}`
      : prompt;

    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig,
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  /**
   * Generate embeddings
   */
  override async generateEmbedding(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: "embedding-001" });

    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  /**
   * Classify text
   */
  override async classifyText(
    text: string,
    labels: string[]
  ): Promise<Classification> {
    const prompt = `Classify the following text into exactly one of these categories: ${labels.join(", ")}.

Text: "${text}"

Respond with only JSON in this format:
{
  "label": "chosen category",
  "confidence": 0.95,
  "scores": {
    "category1": 0.95,
    "category2": 0.03,
    "category3": 0.02
  }
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
      // Fallback
    }

    // Default response
    const label = labels[0] || "unknown";
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
    const styleInstructions = {
      bullet: "Create a concise bullet-point summary",
      paragraph: "Write a well-structured paragraph summary",
      tldr: "Provide a single sentence TL;DR",
      "key-points": "List only the most critical key points",
      executive: "Write a professional executive summary",
    };

    const prompt = `${styleInstructions[options?.style || "paragraph"]} of this text:

"${text}"

${options?.maxLength ? `Limit to ${options.maxLength} characters.` : ""}`;

    return this.generateText(prompt, {
      maxTokens: options?.maxLength ? Math.ceil(options.maxLength / 4) : 200,
      temperature: 0.3,
    });
  }

  /**
   * Analyze image (Gemini Pro Vision)
   */
  override async analyzeImage(
    image: string | Blob,
    options?: ImageAnalysisOptions
  ): Promise<ImageAnalysis> {
    const model = this.client.getGenerativeModel({
      model: "gemini-pro-vision",
    });

    // Convert image to base64 if needed
    let base64Image: string;
    if (image instanceof Blob) {
      const buffer = await image.arrayBuffer();
      base64Image = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    } else {
      base64Image = image.replace(/^data:image\/\w+;base64,/, "");
    }

    const features = options?.features || ["description", "objects", "text"];
    const prompt = `Analyze this image and provide a detailed response in JSON format with these features: ${features.join(", ")}.

Expected format:
{
  ${features.includes("description") ? '"description": "detailed description",' : ""}
  ${features.includes("objects") ? '"objects": [{"label": "object", "confidence": 0.9}],' : ""}
  ${features.includes("text") ? '"text": [{"text": "extracted text", "confidence": 0.9}],' : ""}
  ${features.includes("colors") ? '"colors": [{"hex": "#000000", "name": "black", "percentage": 30}],' : ""}
  ${features.includes("tags") ? '"tags": ["tag1", "tag2"]' : ""}
}`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const response = await result.response;
    const responseText = response.text();

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback
    }

    return {
      description: responseText,
      objects: [],
      text: [],
      colors: [],
      tags: [],
    };
  }

  /**
   * Generate code
   */
  override async generateCode(prompt: string, options?: any): Promise<any> {
    const systemContext = `You are an expert programmer. Generate high-quality code.
${options?.includeComments ? "Include clear comments." : ""}
${options?.includeTests ? "Include comprehensive tests." : ""}
Style: ${options?.style || "clean and efficient"}`;

    const fullPrompt = `${systemContext}

Language: ${options?.language || "auto-detect"}
Framework: ${options?.framework || "none"}
Task: ${prompt}

Provide response as JSON:
{
  "code": "complete code",
  "language": "programming language",
  "explanation": "what the code does",
  ${options?.includeTests ? '"tests": "test code",' : ""}
  "dependencies": ["list", "of", "dependencies"]
}`;

    const response = await this.generateText(fullPrompt, {
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
    };
  }

  /**
   * Explain code
   */
  override async explainCode(code: string, language?: string): Promise<string> {
    const prompt = `Analyze and explain this ${language || "code"}:

\`\`\`${language || ""}
${code}
\`\`\`

Provide a comprehensive explanation covering:
1. Purpose and functionality
2. How it works step by step
3. Key algorithms or patterns used
4. Complexity analysis
5. Potential optimizations or issues`;

    return this.generateText(prompt, {
      temperature: 0.3,
      maxTokens: 1500,
    });
  }
}
