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

      const stories: StoryOption[] = [];

      // Generate stories one by one to ensure we get the requested count
      for (let i = 0; i < count; i++) {
        try {
          const prompt = PromptBuilder.buildStoryOptionsPrompt(profile, 1);

          const aiResponse = await openRouterClient.generateCompletion(prompt, {
            maxTokens: 1200, // More tokens for detailed content
            temperature: 0.8, // Higher creativity for variety
          });

          const newStories = this.parseStoryOptionsResponse(aiResponse, 1);

          if (newStories.length > 0 && newStories[0]) {
            // Update the story ID to include the index
            newStories[0].id = `story_${i + 1}_${Date.now()}`;
            stories.push(newStories[0]);
          }
        } catch (error) {
          console.warn(`Failed to generate story ${i + 1}:`, error);
          // Continue with next story instead of failing completely
        }
      }

      // If we couldn't generate any stories, throw an error
      if (stories.length === 0) {
        throw new Error('Unable to generate any story options');
      }

      // Validate each story option
      const validatedStories = await this.validateStoryOptions(stories, profile);

      const response: GenerateStoriesResponse = {
        stories: validatedStories,
        generatedAt: new Date().toISOString(),
      };

      logger.info('Story options generated successfully', {
        storyCount: validatedStories.length,
        requestedCount: count
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
   * Parse AI response for story options (simple text format)
   */
  private static parseStoryOptionsResponse(response: string, count: number): StoryOption[] {
    try {
      // Clean the response - remove markdown code blocks
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/^```.*?\n?/g, '').replace(/\n?```$/g, '');

      // Parse the simple format: TITLE: ..., DESCRIPTION: ..., etc.
      const lines = cleanResponse.split('\n').map(line => line.trim()).filter(line => line);

      let title = '';
      let description = '';
      let duration = 10;
      let energyLevel: 'high' | 'medium' | 'calming' = 'medium';
      let contentTags: string[] = ['adventure'];

      for (const line of lines) {
        if (line.startsWith('TITLE:')) {
          title = line.substring(6).trim();
        } else if (line.startsWith('DESCRIPTION:')) {
          description = line.substring(12).trim();
        } else if (line.startsWith('DURATION:')) {
          const durStr = line.substring(9).trim();
          const durNum = parseInt(durStr, 10);
          if (!isNaN(durNum) && durNum >= 5 && durNum <= 15) {
            duration = durNum;
          }
        } else if (line.startsWith('ENERGY:')) {
          const energy = line.substring(7).trim().toLowerCase();
          if (['high', 'medium', 'calming'].includes(energy)) {
            energyLevel = energy as 'high' | 'medium' | 'calming';
          }
        } else if (line.startsWith('TAGS:')) {
          const tagsStr = line.substring(5).trim();
          contentTags = tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag);
          if (contentTags.length === 0) {
            contentTags = ['adventure'];
          }
        }
      }

      // Validate that we have the required fields
      if (title && description && description.length > 50) {
        const story: StoryOption = {
          id: `story_1_${Date.now()}`,
          title,
          description,
          estimatedDuration: duration,
          energyLevel,
          contentTags,
          preview: description.substring(0, 100) + (description.length > 100 ? '...' : '')
        };

        console.log('Successfully parsed story from text format');
        return [story];
      }

      // If parsing fails, fall back to text parsing
      console.warn('Failed to parse text format, falling back to legacy parsing');
      return this.parseStoryOptionsResponseFallback(response, count);

    } catch (error) {
      console.warn('Text parsing failed, falling back to legacy parsing');
      return this.parseStoryOptionsResponseFallback(response, count);
    }
  }

  /**
   * Fallback text parsing for story options (legacy support)
   */
  private static parseStoryOptionsResponseFallback(response: string, count: number): StoryOption[] {
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

        // Safety check on description (lenient validation for story descriptions)
        const safetyResult = await this.validateStoryDescription(story.description, profile);

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
   * Validate story description (more lenient than full story validation)
   */
  private static async validateStoryDescription(
    description: string,
    _profile: ChildProfile
  ): Promise<{ isSafe: boolean; score: number; issues: string[] }> {
    const issues: string[] = [];
    let score = 100;

    // Check for inappropriate words
    const inappropriateWords = [
      'violence', 'death', 'scary', 'monster', 'ghost', 'witch',
      'curse', 'poison', 'weapon', 'fight', 'battle', 'war'
    ];

    const lowerDescription = description.toLowerCase();
    const foundWords = inappropriateWords.filter(word => lowerDescription.includes(word));

    if (foundWords.length > 0) {
      issues.push(`Contains potentially inappropriate words: ${foundWords.join(', ')}`);
      score -= 20 * foundWords.length;
    }

    // Check minimum length (much more lenient for descriptions)
    const wordCount = description.split(/\s+/).length;
    const minWords = 15; // Much lower threshold for descriptions

    if (wordCount < minWords) {
      issues.push(`Description too short (${wordCount} words, minimum ${minWords})`);
      score -= 30;
    }

    // Check maximum length
    const maxWords = 150; // Reasonable limit for descriptions
    if (wordCount > maxWords) {
      issues.push(`Description too long (${wordCount} words, maximum ${maxWords})`);
      score -= 10;
    }

    return {
      isSafe: issues.length === 0,
      score: Math.max(0, score),
      issues
    };
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
