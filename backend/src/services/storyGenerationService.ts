import {
  ChildProfile,
  StoryOption,
  StoryContent,
  GenerateStoriesResponse,
  GenerateStoryContentResponse
} from '../types/index.js';
import { PromptBuilder } from './promptBuilder.js';
import { ContentSafetyService } from './contentSafetyService.js';
import { DatabaseService, SavedStorySegment } from './databaseService.js';
import { openRouterClient } from '../config/openai.js';
import { logger } from '../utils/logger.js';

export class StoryGenerationService {
  /**
   * Generate 3 unique story options for a child profile with enhanced prompts
   */
  static async generateStoryOptions(
    profile: ChildProfile,
    count: number = 3,
    generalMessage?: string
  ): Promise<GenerateStoriesResponse> {
    try {
      logger.info('Generating story options', { count, usesShortPreviews: count >= 4 });

      const stories: StoryOption[] = [];

      if (count >= 4) {
        // Short previews flow: request concise one-sentence ideas
        const prompt = PromptBuilder.buildShortPreviewPrompt(profile, count, generalMessage);

        const aiResponse = await openRouterClient.generateCompletion(prompt, {
          maxTokens: 400, // short output
          temperature: 0.8,
        });

        // Parse numbered one-line responses into simple StoryOption entries
        const raw = aiResponse.trim().replace(/^```.*?\n?/g, '').replace(/\n?```$/g, '');
        const lines = raw.split(/\n+/).map(l => l.trim()).filter(l => l);
        const previews: string[] = [];

        for (const line of lines) {
          const m = line.match(/^(?:\d+\.|\d+\))?\s*(.*)$/);
          if (m && m[1]) {
            const sentence = m[1].replace(/^[-:\s]*/, '').trim();
            if (sentence.length > 0) previews.push(sentence);
          }
        }

        // If AI returned fewer than requested, fallback to simple local augmentations
        while (previews.length < count) {
          previews.push(`A quiet bedtime idea about [CHILD_NAME] and a gentle adventure.`);
        }

        // Build StoryOption objects (simple titles and previews); descriptions will be empty for now
        const allOptions: StoryOption[] = previews.map((p, i) => ({
          id: `preview_${i + 1}_${Date.now()}`,
          title: `Short Idea ${i + 1}`,
          description: p,
          estimatedDuration: 5,
          energyLevel: 'calming',
          contentTags: [],
          preview: p
        }));

        // Select 3 most distinct previews
        const selected = this.selectMostDistinctPreviews(allOptions, 3);

        const response: GenerateStoriesResponse = {
          stories: selected,
          generatedAt: new Date().toISOString(),
          // @ts-ignore add optional field carrying all previews for clients that want to show them
          allPreviews: allOptions
        } as any;

        logger.info('Short previews generated', { totalRequested: count, returned: selected.length });
        return response;
      }

      // Legacy detailed story flow for small counts
      logger.info('Generating full story options with detailed prompts', { profile: profile.name, count });

      // Generate stories one by one with specific constraints for each
      for (let i = 0; i < count; i++) {
        try {
          const prompt = PromptBuilder.buildSingleStoryPrompt(profile, i, generalMessage);

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

      // Apply diversity enforcement if stories are too similar
      const diversityEnforcedStories = this.enforceDiversity(validatedStories);

      const response: GenerateStoriesResponse = {
        stories: diversityEnforcedStories,
        generatedAt: new Date().toISOString(),
      };

      logger.info('Story options generated successfully with enhanced prompts', {
        storyCount: validatedStories.length,
        requestedCount: count,
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate story options', { error });
      throw new Error('Unable to generate story options at this time');
    }
  }

  /**
   * Generate full story content with choice points and save to database
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
        title: storyOption.title,
        hasChoices: !!choices
      });

      const prompt = PromptBuilder.buildFullStoryPrompt(profile, storyOption, choices);

      const aiResponse = await openRouterClient.generateCompletion(prompt, {
        maxTokens: 2000,
        temperature: 0.7,
      });

      const storyContent = this.parseFullStoryResponse(aiResponse, storyOption);

      // Store original choice points before safety check
      const originalChoicePoints = [...storyContent.choicePoints];

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
          // Keep the original choice points since improvement shouldn't affect choice structure
          storyContent.choicePoints = originalChoicePoints;
          logger.info('Story content improved, preserving original choice points', {
            originalWordCount: storyContent.content.split(/\s+/).length,
            improvedWordCount: improvedContent.split(/\s+/).length,
            choicePointsPreserved: storyContent.choicePoints.length
          });
        } else {
          logger.warn('Story content improvement failed, using original content');
        }
      }

      // Validate story content before saving
      if (!storyContent.content || storyContent.content.trim().length === 0) {
        throw new Error('Story content is empty after generation and improvement');
      }

      // Save the story to database with all segments and choices
      await this.saveCompleteStory(storyId, profile, storyOption, storyContent, choices);

      const response: GenerateStoryContentResponse = {
        story: storyContent,
        generatedAt: new Date().toISOString(),
      };

      logger.info('Full story content generated and saved successfully', {
        storyId,
        wordCount: storyContent.content.split(/\s+/).length,
        choicePoints: storyContent.choicePoints.length,
        savedToDatabase: true
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate story content', { error, storyId });
      throw new Error('Unable to generate story content at this time');
    }
  }

  /**
   * Parse AI response for multiple story options with variance
   */
  private static parseStoryOptionsResponse(response: string, count: number): StoryOption[] {
    try {
      // Clean the response
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/^```.*?\n?/g, '').replace(/\n?```$/g, '');

      const stories: StoryOption[] = [];
      const storyBlocks = cleanResponse.split(/STORY \d+:/i).filter(block => block.trim());

      for (let i = 0; i < Math.min(storyBlocks.length, count); i++) {
        const block = storyBlocks[i];
        if (!block) continue;

        const lines = block.split('\n').map(line => line.trim()).filter(line => line);

        let title = '';
        let description = '';
        let duration = 10;
        let energyLevel: 'energetic' | 'peaceful' | 'mystical' | 'playful' | 'cozy' | 'adventurous' | 'gentle' | 'exciting' | 'high' | 'medium' | 'calming' = 'medium';
        let contentTags: string[] = ['adventure'];

        for (const line of lines) {
          if (line.startsWith('TITLE:')) {
            title = line.substring(6).trim();
          } else if (line.startsWith('DESCRIPTION:')) {
            description = line.substring(12).trim();
            // Clean up any duration information that might have been included in description
            description = description.replace(/\s*DURATION:\s*\d+\s*$/i, '').trim();
          } else if (line.startsWith('DURATION:')) {
            const durStr = line.substring(9).trim();
            const durNum = parseInt(durStr, 10);
            if (!isNaN(durNum) && durNum >= 5 && durNum <= 15) {
              duration = durNum;
            }
          } else if (line.startsWith('ENERGY:')) {
            const energy = line.substring(7).trim().toLowerCase();
            const validEnergyLevels = ['energetic', 'peaceful', 'mystical', 'playful', 'cozy', 'adventurous', 'gentle', 'exciting', 'high', 'medium', 'calming'];
            if (validEnergyLevels.includes(energy)) {
              energyLevel = energy as 'energetic' | 'peaceful' | 'mystical' | 'playful' | 'cozy' | 'adventurous' | 'gentle' | 'exciting' | 'high' | 'medium' | 'calming';
            }
          } else if (line.startsWith('TAGS:')) {
            const tagsStr = line.substring(5).trim();
            contentTags = tagsStr.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
            if (contentTags.length === 0) {
              contentTags = ['adventure'];
            }
          }
        }

        // Validate required fields
        if (title && description && description.length > 50) {
          const story: StoryOption = {
            id: `story_${i + 1}_${Date.now()}`,
            title,
            description,
            estimatedDuration: duration,
            energyLevel,
            contentTags,
            preview: description.substring(0, 100) + (description.length > 100 ? '...' : '')
          };
          stories.push(story);
        }
      }

      if (stories.length === 0) {
        logger.warn('No stories parsed from AI response, falling back to legacy parsing');
        return this.parseStoryOptionsResponseFallback(response, count);
      }

      // Ensure we have the requested number of stories
      while (stories.length < count && stories.length > 0) {
        // Duplicate the last story with slight variations
        const lastStory = stories[stories.length - 1];
        if (lastStory) {
          const newStory: StoryOption = {
            ...lastStory,
            id: `story_${stories.length + 1}_${Date.now()}`,
            title: lastStory.title + ' Continued',
            energyLevel: lastStory.energyLevel === 'energetic' ? 'peaceful' : lastStory.energyLevel === 'peaceful' ? 'mystical' : 'playful' as 'energetic' | 'peaceful' | 'mystical' | 'playful' | 'cozy' | 'adventurous' | 'gentle' | 'exciting' | 'high' | 'medium' | 'calming'
          };
          stories.push(newStory);
        }
      }

      logger.info(`Successfully parsed ${stories.length} stories with variance`);
      return stories;

    } catch (error) {
      logger.warn('Multi-story parsing failed, falling back to legacy parsing', { error });
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
      const energyMatch = block.match(/Energy(?:\s+Level)?:\s*(energetic|peaceful|mystical|playful|cozy|adventurous|gentle|exciting|high|medium|calming)/i);
      const energyLevel = energyMatch && energyMatch[1] ? energyMatch[1].toLowerCase() as 'energetic' | 'peaceful' | 'mystical' | 'playful' | 'cozy' | 'adventurous' | 'gentle' | 'exciting' | 'high' | 'medium' | 'calming' : 'medium';

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
    // For pre-generated branching, we need to generate the full story with all branches
    // Extract choice points and create segments for all possible paths

    const allChoicePoints = this.extractChoicePoints(response);
    console.log('All extracted choice points:', allChoicePoints.length);

    // Clean the main content (remove choice point text)
    let cleanedContent = response.trim();

    if (allChoicePoints.length > 0) {
      // Find the first choice point and extract content up to it
      const choicePointIndex = response.search(/Choice Point \d+:/i);
      if (choicePointIndex !== -1) {
        cleanedContent = response.substring(0, choicePointIndex).trim();
      }
    }

    // Remove any choice-related text
    cleanedContent = cleanedContent.replace(/\[[^\]]+\]\s+and\s+[^,]*,?\s+chose\s+Option\s+[AB]\s*\([^)]*\),\s*and\s+off\s+they\s+went!/gi, '');
    cleanedContent = cleanedContent.replace(/chose\s+Option\s+[AB]\s*\([^)]*\)/gi, '');

    // Clean up extra whitespace
    cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

    console.log('Final content preview:', cleanedContent.substring(0, 100) + '...');
    console.log('Final choice points:', allChoicePoints.length);

    return {
      id: storyOption.id,
      title: storyOption.title,
      content: cleanedContent,
      choicePoints: allChoicePoints, // Include all choice points for branching
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

    // Split content by "Choice Point" to find all choice sections
    const choiceSections = content.split(/Choice Point \d+:/);

    for (let i = 1; i < choiceSections.length; i++) {
      const section = choiceSections[i];
      if (!section) continue;

      // Extract the situation (text before Option A)
      // Look for text up to the first "Option A:" or just take the beginning of the section
      const optionAIndex = section.indexOf('Option A:');
      const situation = optionAIndex !== -1
        ? section.substring(0, optionAIndex).trim()
        : (section.split('\n')[0] || '').trim();

      // Extract Option A
      const optionAMatch = section.match(/Option A:\s*([^\n]+)/);
      const optionA = optionAMatch && optionAMatch[1] ? optionAMatch[1].trim() : '';

      // Extract Option B
      const optionBMatch = section.match(/Option B:\s*([^\n]+)/);
      const optionB = optionBMatch && optionBMatch[1] ? optionBMatch[1].trim() : '';

      console.log(`Choice point ${i} extraction:`, { situation, optionA, optionB });

      if (situation && optionA && optionB) {
        // Use a highly unique ID to guarantee uniqueness across all stories
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
        const choiceId = `choice_${uniqueId}`;
        choicePoints.push({
          id: choiceId,
          text: situation,
          choices: [
            {
              id: 'A',
              text: optionA,
              outcome: 'This choice leads to an exciting adventure!',
            },
            {
              id: 'B',
              text: optionB,
              outcome: 'This choice brings a peaceful resolution!',
            },
          ],
        });
      }
    }

    console.log('Extracted choice points:', choicePoints.length);
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

  /**
   * Parse AI response for story continuation
   */
  static parseContinuationResponse(response: string): { content: string; choicePoints: any[] } {
    try {
      // Clean the response
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/^```.*?\n?/g, '').replace(/\n?```$/g, '');

      // Extract any choice points from the continuation
      const choicePoints = this.extractChoicePoints(cleanResponse);

      // Remove choice point text from the main content
      if (choicePoints.length > 0) {
        // Use a simpler approach - find the first "Choice Point" and remove everything from there
        const choicePointIndex = cleanResponse.search(/Choice Point \d+:/i);
        if (choicePointIndex !== -1) {
          cleanResponse = cleanResponse.substring(0, choicePointIndex).trim();
        }
      }

      return {
        content: cleanResponse.trim(),
        choicePoints
      };
    } catch (error) {
      logger.warn('Failed to parse continuation response', { error });
      return {
        content: response.trim(),
        choicePoints: []
      };
    }
  }

  /**
   * Save story with initial segment and choice points to database
   */
  private static async saveCompleteStory(
    storyId: string,
    profile: ChildProfile,
    storyOption: StoryOption,
    storyContent: StoryContent,
    _choices?: Record<string, string>
  ): Promise<void> {
    try {
      // Save child profile first
      DatabaseService.saveChildProfile(profile);

      // Create initial segment with choice points
      const initialSegment: SavedStorySegment = {
        id: `${storyId}_segment_1`,
        storyId,
        content: storyContent.content,
        segmentOrder: 0,
        hasChoices: storyContent.choicePoints && storyContent.choicePoints.length > 0,
        createdAt: new Date().toISOString(),
        choicePoints: storyContent.choicePoints || []
      };

      // Save to database
      const savedStoryId = DatabaseService.saveStory(storyOption, profile, storyContent, [initialSegment]);

      logger.info('Story with initial segment saved to database', {
        storyId: savedStoryId,
        hasChoices: initialSegment.hasChoices,
        choicePointsCount: storyContent.choicePoints?.length || 0
      });

    } catch (error) {
      logger.error('Failed to save story to database', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        storyId
      });
      throw error;
    }
  }

  /**
   * Generate a continuation for a specific choice
   */
  static async generateChoiceContinuation(
    profile: ChildProfile,
    story: { id: string; title: string },
    currentSegment: SavedStorySegment,
    selectedChoice: { id: string; text: string; outcome: string }
  ): Promise<{ content: string; choicePoints: any[] }> {
    const continuationPrompt = PromptBuilder.buildStoryContinuationPrompt(
      profile,
      story as any,
      currentSegment as any,
      selectedChoice
    );

    const aiResponse = await openRouterClient.generateCompletion(continuationPrompt, {
      maxTokens: 800, // Shorter for branches
      temperature: 0.7,
    });

    return this.parseContinuationResponse(aiResponse);
  }

  /**
   * Enforce diversity by modifying similar stories
   */
  private static enforceDiversity(stories: StoryOption[]): StoryOption[] {
    if (stories.length < 2) return stories;

    const enforcedStories = [...stories];

    // Check for similar titles and modify them
    for (let i = 0; i < enforcedStories.length; i++) {
      for (let j = i + 1; j < enforcedStories.length; j++) {
        const story1 = enforcedStories[i];
        const story2 = enforcedStories[j];

        if (story1 && story2) {
          // Check for similar title keywords
          const title1Words = story1.title.toLowerCase().split(/\s+/);
          const title2Words = story2.title.toLowerCase().split(/\s+/);
          const commonWords = title1Words.filter(word => title2Words.includes(word) && word.length > 3);

          if (commonWords.length > 1) {
            // Modify the second story's title to be more unique
            story2.title = this.generateUniqueTitle(story2.title, story1.title);
          }

          // Check for similar energy levels
          if (story1.energyLevel === story2.energyLevel) {
            // Change the second story's energy level
            const alternativeEnergies = ['energetic', 'peaceful', 'mystical', 'playful', 'cozy', 'adventurous', 'gentle', 'exciting'];
            const differentEnergy = alternativeEnergies.find(energy => energy !== story1.energyLevel);
            if (differentEnergy) {
              story2.energyLevel = differentEnergy as any;
            }
          }

          // Check for similar opening phrases
          const opening1 = story1.description.split('.')[0]?.toLowerCase() || '';
          const opening2 = story2.description.split('.')[0]?.toLowerCase() || '';

          if (this.hasSimilarOpening(opening1, opening2)) {
            // Fix the second story's opening
            story2.description = this.fixRepetitiveOpening(story2.description, j);
          }
        }
      }
    }

    return enforcedStories;
  }

  /**
   * Generate a more unique title by modifying common words
   */
  private static generateUniqueTitle(originalTitle: string, otherTitle: string): string {
    const otherWords = otherTitle.toLowerCase().split(/\s+/);
    const titleWords = originalTitle.split(/\s+/);

    // Replace common words with synonyms
    const synonyms: Record<string, string[]> = {
      'great': ['amazing', 'wonderful', 'fantastic', 'incredible'],
      'green': ['emerald', 'lush', 'vibrant', 'bright'],
      'garden': ['meadow', 'grove', 'patch', 'plot'],
      'rabbit': ['bunny', 'hare', 'cottontail', 'hoppity'],
      'adventure': ['journey', 'quest', 'expedition', 'exploration'],
      'race': ['chase', 'pursuit', 'hunt', 'search'],
      'rescue': ['save', 'help', 'aid', 'assist']
    };

    const modifiedWords = titleWords.map(word => {
      const lowerWord = word.toLowerCase();
      if (otherWords.includes(lowerWord) && synonyms[lowerWord]) {
        const alternatives = synonyms[lowerWord];
        return alternatives[Math.floor(Math.random() * alternatives.length)];
      }
      return word;
    });

    return modifiedWords.join(' ');
  }

  /**
   * Check if two opening sentences are too similar
   */
  private static hasSimilarOpening(opening1: string, opening2: string): boolean {
    // Check for common problematic patterns
    const problematicPatterns = [
      'suddenly, a',
      'suddenly a',
      'one sunny morning',
      'deep in the heart',
      'in the quiet',
      'the day started'
    ];

    // Check if both openings start with the same problematic pattern
    for (const pattern of problematicPatterns) {
      if (opening1.startsWith(pattern) && opening2.startsWith(pattern)) {
        return true;
      }
    }

    // Check for high word overlap in first 10 words
    const words1 = opening1.split(/\s+/).slice(0, 10);
    const words2 = opening2.split(/\s+/).slice(0, 10);
    const commonWords = words1.filter(word => words2.includes(word) && word.length > 3);

    return commonWords.length >= 3; // If 3+ words overlap, consider it similar
  }

  /**
   * Fix repetitive opening by replacing it with a different pattern
   */
  private static fixRepetitiveOpening(description: string, storyIndex: number): string {
    const openingPatterns = [
      '[CHILD_NAME] had always dreamed of',
      'In the quiet',
      'The day started like any other, until',
      'A mysterious',
      'When [CHILD_NAME] discovered',
      'In a world where',
      'As [CHILD_NAME] explored',
      'The moment [CHILD_NAME] found'
    ];

    // Get the first sentence
    const sentences = description.split('.');
    const firstSentence = sentences[0] || '';
    const restOfDescription = sentences.slice(1).join('.').trim();

    // Choose a different opening pattern based on story index
    const newOpening = openingPatterns[storyIndex % openingPatterns.length];

    // Replace the opening with the new pattern
    const newFirstSentence = firstSentence.replace(/^[^a-zA-Z]*/, newOpening + ' ');

    return newFirstSentence + (restOfDescription ? '. ' + restOfDescription : '');
  }

  /**
   * Choose the k most distinct previews from a list using a greedy Jaccard distance heuristic
   */
  private static selectMostDistinctPreviews(options: StoryOption[], k: number): StoryOption[] {
    if (options.length <= k) return options;

    // Helper to build word set
    const tokenize = (text: string) => text.toLowerCase().replace(/[.,!?:;"'()]/g, '').split(/\s+/).filter(Boolean);

    const sets = options.map(o => new Set(tokenize(o.preview)));

    // Jaccard distance
    const jaccardDist = (a: Set<string>, b: Set<string>) => {
      const inter = [...a].filter(x => b.has(x)).length;
      const uni = new Set([...a, ...b]).size;
      if (uni === 0) return 1;
      const j = inter / uni;
      return 1 - j; // distance
    };

    // Greedy selection: start with the preview that has the most unique words (largest set)
    const selected: number[] = [];
    const remaining = new Set(options.map((_, idx) => idx));

    // Pick initial item as the one with largest set size
    let firstIdx = 0;
    let bestSize = -1;
    sets.forEach((s, idx) => {
      if (s.size > bestSize) {
        bestSize = s.size;
        firstIdx = idx;
      }
    });

    selected.push(firstIdx);
    remaining.delete(firstIdx);

    while (selected.length < k && remaining.size > 0) {
      let bestIdx = -1;
      let bestMinDist = -1;

      for (const idx of [...remaining]) {
        // compute min distance to already selected
        const distances = selected.map(sidx => jaccardDist(sets[sidx]!, sets[idx]!));
        const d = Math.min(...distances);
        if (d > bestMinDist) {
          bestMinDist = d;
          bestIdx = idx;
        }
      }

      if (bestIdx === -1) break;
      selected.push(bestIdx);
      remaining.delete(bestIdx);
    }

    return selected.map(i => options[i]!);
  }
}
