import OpenAI from 'openai';
import { environment } from './environment.js';

export interface AIModel {
  id: string;
  name: string;
  costPerToken: number;
  isFree: boolean;
}

// Available AI models (OpenRouter)
export const AI_MODELS: Record<string, AIModel> = {
  PRIMARY: {
    id: 'arli-ai/qwq-32b-rp-r1',
    name: 'ArliAI QwQ 32B RpR v1',
    costPerToken: 0,
    isFree: true,
  },
  SECONDARY: {
    id: 'thedrummer/rocinante-12b',
    name: 'TheDrummer/Rocinante-12B',
    costPerToken: 0.0000005,
    isFree: false,
  },
  TERTIARY: {
    id: 'mistralai/mistral-nemo-12b-instruct',
    name: 'Mistral Nemo 12B Celeste',
    costPerToken: 0.0000012,
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
      // Try primary model first
      return await this.tryModel(AI_MODELS.PRIMARY!, prompt, maxTokens, temperature);
    } catch (error) {
      console.warn(`Primary model failed: ${error}`);

      if (!fallbackToPaid) {
        throw error;
      }

      // Try secondary model
      try {
        return await this.tryModel(AI_MODELS.SECONDARY!, prompt, maxTokens, temperature);
      } catch (secondaryError) {
        console.warn(`Secondary model failed: ${secondaryError}`);

        // Try tertiary model
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
