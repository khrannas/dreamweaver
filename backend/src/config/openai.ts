import OpenAI from 'openai';
import { environment } from './environment.js';

export interface AIModel {
  id: string;
  name: string;
  costPerToken: number;
  isFree: boolean;
}

// Available AI models (OpenRouter) - Most cost-effective paid models
export const AI_MODELS: Record<string, AIModel> = {
  PRIMARY: {
    id: 'mistralai/mistral-small-3.2-24b-instruct',
    name: 'Mistral Small 3.2 24B Instruct',
    costPerToken: 0.000000075, // $0.075 per 1M tokens - Most cost-effective
    isFree: false,
  },
  SECONDARY: {
    id: 'openai/gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    costPerToken: 0.00000015, // $0.15 per 1M tokens - High quality, low cost
    isFree: false,
  },
  TERTIARY: {
    id: 'anthropic/claude-3-haiku',
    name: 'Anthropic Claude 3 Haiku',
    costPerToken: 0.00000025, // $0.25 per 1M tokens - Reliable fallback
    isFree: false,
  },
};

export class OpenRouterClient {
  private client: OpenAI;
  private currentModel: AIModel;

  constructor() {
    this.client = new OpenAI({
      apiKey: environment.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });

    this.currentModel = AI_MODELS.PRIMARY!;
  }

  async generateCompletion(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      fallbackToPaid?: boolean;
    } = {}
  ): Promise<string> {
    const { maxTokens = 1000, temperature = 0.7, fallbackToPaid = true } = options;

    try {
      // Try primary model first (most cost-effective)
      return await this.tryModel(AI_MODELS.PRIMARY!, prompt, maxTokens, temperature);
    } catch (error) {
      console.warn(`Primary model failed: ${error}`);

      if (!fallbackToPaid) {
        throw error;
      }

      // Try secondary model (higher quality, slightly more expensive)
      try {
        return await this.tryModel(AI_MODELS.SECONDARY!, prompt, maxTokens, temperature);
      } catch (secondaryError) {
        console.warn(`Secondary model failed: ${secondaryError}`);

        // Try tertiary model (most reliable fallback)
        try {
          return await this.tryModel(AI_MODELS.TERTIARY!, prompt, maxTokens, temperature);
        } catch (tertiaryError) {
          console.error(`All models failed. Tertiary error: ${tertiaryError}`);
          throw new Error('All AI models are currently unavailable');
        }
      }
    }
  }

  private async tryModel(
    model: AIModel,
    prompt: string,
    maxTokens: number,
    temperature: number
  ): Promise<string> {
    this.currentModel = model;

    const completion = await this.client.chat.completions.create({
      model: model.id,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: temperature,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error(`No content generated from ${model.name}`);
    }

    return content.trim();
  }

  getCurrentModel(): AIModel {
    return this.currentModel;
  }
}

// Singleton instance
export const openRouterClient = new OpenRouterClient();
