import {
  ChildProfile,
  StoryOption,
  StoryContent,
  GenerateStoriesResponse,
  GenerateStoryContentResponse
} from '../types/index.js';
import { PromptBuilder } from './promptBuilder.js';
import { ContentSafetyService } from './contentSafetyService.js';
import { openRouterClient } from '../config/openai.js';
import { logger } from '../utils/logger.js';

export class StoryGenerationService {
  /**
   * Generate 3 unique story options for a child profile
   */
  static async generateStoryOptions(
    profile: ChildProfile,
    count: number = 3
  ): Promise<GenerateStoriesResponse> {
    try {
      logger.info('Generating story options', { profile: profile.name, count });

      const prompt = PromptBuilder.buildStoryOptionsPrompt(profile, count);

      const aiResponse = await openRouterClient.generateCompletion(prompt, {
        maxTokens: 1200,
        temperature: 0.8, // Higher creativity for variety
      });

      const stories = this.parseStoryOptionsResponse(aiResponse, count);

      // Validate each story option
      const validatedStories = await this.validateStoryOptions(stories, profile);

      const response: GenerateStoriesResponse = {
        stories: validatedStories,
        generatedAt: new Date().toISOString(),
      };

      logger.info('Story options generated successfully', {
        storyCount: validatedStories.length
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate story options', { error, profile: profile.name });
      throw new Error('Unable to generate story options at this time');
    }
  }

  /**
   * Generate full story content with choice points
   */
  static async generateStoryContent(
    storyId: string,
    profile: ChildProfile,
    storyOption: StoryOption,
    choices?: Record<string, string>
  ): Promise<GenerateStoryContentResponse> {
    try {
      logger.info('Generating full story content', {
        storyId,
        profile: profile.name,
        title: storyOption.title
      });

      const prompt = PromptBuilder.buildFullStoryPrompt(profile, storyOption, choices);

      const aiResponse = await openRouterClient.generateCompletion(prompt, {
        maxTokens: 2000,
        temperature: 0.7,
      });

      const storyContent = this.parseFullStoryResponse(aiResponse, storyOption);

      // Safety check the generated content
      const safetyResult = await ContentSafetyService.checkContentSafety(
        storyContent.content,
        profile
      );

      if (!safetyResult.isSafe && ContentSafetyService.needsImprovement(safetyResult)) {
        logger.warn('Story content failed safety check, attempting improvement', {
          score: safetyResult.score,
          issues: safetyResult.issues
        });

        // Attempt to improve the content
        const improvedContent = await this.improveStoryContent(
          storyContent.content,
          safetyResult.issues
        );

        if (improvedContent) {
          storyContent.content = improvedContent;
        }
      }

      const response: GenerateStoryContentResponse = {
        story: storyContent,
        generatedAt: new Date().toISOString(),
      };

      logger.info('Full story content generated successfully', {
        storyId,
        wordCount: storyContent.content.split(/\s+/).length,
        choicePoints: storyContent.choicePoints.length
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate story content', { error, storyId });
      throw new Error('Unable to generate story content at this time');
    }
  }

  /**
   * Parse AI response for story options
   */
  private static parseStoryOptionsResponse(response: string, count: number): StoryOption[] {
    const stories: StoryOption[] = [];

    // Split response into individual story blocks
    const storyBlocks = response.split(/\d+\.\s+|Story \d+:/i).filter(block => block.trim());

    for (let i = 0; i < Math.min(storyBlocks.length, count); i++) {
      const block = storyBlocks[i];
      if (!block) continue;
      const trimmedBlock = block.trim();
      if (!trimmedBlock) continue;

      const story = this.parseStoryOptionBlock(trimmedBlock);
      if (story) {
        story.id = `story_${i + 1}_${Date.now()}`;
        stories.push(story);
      }
    }

    // Ensure we have at least one story
    if (stories.length === 0) {
      throw new Error('Failed to parse story options from AI response');
    }

    return stories;
  }

  /**
   * Parse individual story option block
   */
  private static parseStoryOptionBlock(block: string): StoryOption | null {
    try {
      // Extract title
      const titleMatch = block.match(/^["""]?([^"""\n]+)["""]?$/m);
      const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : 'Untitled Story';

      // Extract description
      const descriptionMatch = block.match(/(?:Description|Summary):\s*(.*?)(?:\n\n|\n(?:Duration|Energy|Tags|Story Options))/is);
      const description = descriptionMatch && descriptionMatch[1] ? descriptionMatch[1].trim() : (block.split('\n')[1] || 'A wonderful adventure awaits!');

      // Extract duration
      const durationMatch = block.match(/Duration:\s*(\d+)(?:\s*-\s*(\d+))?\s*minutes?/i);
      const duration = durationMatch && durationMatch[1] ? parseInt(durationMatch[1], 10) : 10;

      // Extract energy level
      const energyMatch = block.match(/Energy(?:\s+Level)?:\s*(high|medium|calming)/i);
      const energyLevel = energyMatch && energyMatch[1] ? energyMatch[1].toLowerCase() as 'high' | 'medium' | 'calming' : 'medium';

      // Extract tags
      const tagsMatch = block.match(/(?:Tags|Content Tags):\s*(.*?)(?:\n\n|\n(?:Duration|Energy|Story Options))/is);
      const contentTags = tagsMatch && tagsMatch[1]
        ? tagsMatch[1].split(',').map(tag => tag.trim().toLowerCase())
        : ['adventure'];

      return {
        id: '', // Will be set by caller
        title,
        description,
        estimatedDuration: duration,
        energyLevel,
        contentTags,
        preview: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
      };
    } catch (error) {
      logger.warn('Failed to parse story option block', { error, block: block.substring(0, 100) });
      return null;
    }
  }

  /**
   * Parse AI response for full story content
   */
  private static parseFullStoryResponse(response: string, storyOption: StoryOption): StoryContent {
    // Extract choice points
    const choicePoints = this.extractChoicePoints(response);

    return {
      id: storyOption.id,
      title: storyOption.title,
      content: response.trim(),
      choicePoints,
      duration: storyOption.estimatedDuration,
      energyLevel: storyOption.energyLevel,
      contentTags: storyOption.contentTags,
    };
  }

  /**
   * Extract choice points from story content
   */
  private static extractChoicePoints(content: string): any[] {
    const choicePoints = [];
    const choiceRegex = /Choice Point \d+:?\s*(.*?)\n(?:Option A:\s*(.*?)\nOption B:\s*(.*?)(?:\n|$))/gis;

    let match;
    while ((match = choiceRegex.exec(content)) !== null) {
      const [_, situation, optionA, optionB] = match;

      if (situation && optionA && optionB) {
        choicePoints.push({
          id: `choice_${choicePoints.length + 1}`,
          text: situation.trim(),
          choices: [
            {
              id: 'A',
              text: optionA.trim(),
              outcome: 'This choice leads to an exciting adventure!',
            },
            {
              id: 'B',
              text: optionB.trim(),
              outcome: 'This choice brings a peaceful resolution!',
            },
          ],
        });
      }
    }

    return choicePoints;
  }

  /**
   * Validate story options for safety and quality
   */
  private static async validateStoryOptions(
    stories: StoryOption[],
    profile: ChildProfile
  ): Promise<StoryOption[]> {
    const validatedStories: StoryOption[] = [];

    for (const story of stories) {
      try {
        // Basic validation
        if (story.title.length < 5 || story.description.length < 20) {
          logger.warn('Story option failed basic validation', { title: story.title });
          continue;
        }

        // Safety check on description
        const safetyResult = await ContentSafetyService.checkContentSafety(
          story.description,
          profile
        );

        if (safetyResult.isSafe || safetyResult.score >= 70) {
          validatedStories.push(story);
        } else {
          logger.warn('Story option failed safety check', {
            title: story.title,
            score: safetyResult.score,
            issues: safetyResult.issues
          });
        }
      } catch (error) {
        logger.warn('Error validating story option', { error, title: story.title });
        // Include story even if validation fails, but log the issue
        validatedStories.push(story);
      }
    }

    return validatedStories.length > 0 ? validatedStories : stories.slice(0, 1);
  }

  /**
   * Attempt to improve story content based on safety issues
   */
  private static async improveStoryContent(
    content: string,
    issues: string[]
  ): Promise<string | null> {
    try {
      const prompt = PromptBuilder.buildImprovementPrompt(content, issues);

      const improvedContent = await openRouterClient.generateCompletion(prompt, {
        maxTokens: 2000,
        temperature: 0.3, // Lower temperature for more focused improvements
        fallbackToPaid: false
      });

      return improvedContent.trim();
    } catch (error) {
      logger.warn('Failed to improve story content', { error });
      return null;
    }
  }
}
