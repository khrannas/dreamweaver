import { Request, Response, NextFunction } from 'express';
import {
  GenerateStoriesRequest,
  GenerateStoriesResponse,
  GenerateStoryContentRequest,
  GenerateStoryContentResponse
} from '../types/index.js';
import { StoryGenerationService } from '../services/storyGenerationService.js';
import { ContentSafetyService } from '../services/contentSafetyService.js';
import {
  validateGenerateStoriesRequest,
  validateGenerateStoryContentRequest,
  validateChildProfile
} from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { createAPIError } from '../middleware/errorHandler.js';

export class StoryController {
  /**
   * Generate 3 story options for a child profile
   */
  static async generateStories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestData: GenerateStoriesRequest = req.body;
      const count = req.query.count ? parseInt(req.query.count as string, 10) : 3;

      // Validate request
      const validation = validateGenerateStoriesRequest({
        ...requestData,
        count,
      });

      if (!validation.isValid) {
        const error = createAPIError(
          'Invalid request data',
          'VALIDATION_ERROR',
          400,
          { errors: validation.errors }
        );
        res.status(400).json({ error });
        return;
      }

      logger.info('Generating story options', {
        childName: requestData.profile.name,
        age: requestData.profile.age,
        count,
      });

      // Generate stories
      const response: GenerateStoriesResponse = await StoryGenerationService.generateStoryOptions(
        requestData.profile,
        count
      );

      logger.info('Story options generated successfully', {
        storyCount: response.stories.length,
        childName: requestData.profile.name,
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to generate stories', { error });
      next(createAPIError(
        'Failed to generate story options',
        'STORY_GENERATION_ERROR',
        500
      ));
    }
  }

  /**
   * Generate full story content with choice points
   */
  static async generateStoryContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    const storyId = req.params.storyId;

    if (!storyId) {
      const error = createAPIError(
        'Story ID is required',
        'VALIDATION_ERROR',
        400
      );
      res.status(400).json({ error });
      return;
    }

    try {
      const requestData: GenerateStoryContentRequest = {
        storyId,
        ...req.body,
      };

      // Validate request
      const validation = validateGenerateStoryContentRequest(requestData);
      if (!validation.isValid) {
        const error = createAPIError(
          'Invalid request data',
          'VALIDATION_ERROR',
          400,
          { errors: validation.errors }
        );
        res.status(400).json({ error });
        return;
      }

      logger.info('Generating story content', {
        storyId,
        childName: requestData.profile.name,
        hasChoices: !!requestData.choices,
      });

      // Find the story option (in a real implementation, this might come from a database)
      // For now, we'll create a mock story option based on the request
      const mockStoryOption = {
        id: storyId,
        title: `Adventure for ${requestData.profile.name}`,
        description: `A personalized story featuring ${requestData.profile.name} and their favorite ${requestData.profile.favoriteAnimal || 'animal'}`,
        estimatedDuration: 10,
        energyLevel: 'medium' as const,
        contentTags: ['adventure', 'friendship'],
        preview: `Join ${requestData.profile.name} on an exciting adventure!`,
      };

      // Generate story content
      const response: GenerateStoryContentResponse = await StoryGenerationService.generateStoryContent(
        storyId,
        requestData.profile,
        mockStoryOption,
        requestData.choices
      );

      logger.info('Story content generated successfully', {
        storyId,
        wordCount: response.story.content.split(/\s+/).length,
        choicePoints: response.story.choicePoints.length,
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to generate story content', { error, storyId });
      next(createAPIError(
        'Failed to generate story content',
        'STORY_CONTENT_ERROR',
        500
      ));
    }
  }

  /**
   * Validate content safety
   */
  static async validateContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { content, profile } = req.body;

      if (!content || typeof content !== 'string') {
        const error = createAPIError(
          'Content is required and must be a string',
          'VALIDATION_ERROR',
          400
        );
        res.status(400).json({ error });
        return;
      }

      if (!profile || !validateChildProfile(profile).isValid) {
        const error = createAPIError(
          'Valid child profile is required',
          'VALIDATION_ERROR',
          400
        );
        res.status(400).json({ error });
        return;
      }

      logger.info('Validating content safety', {
        contentLength: content.length,
        childName: profile.name,
      });

      const safetyResult = await ContentSafetyService.checkContentSafety(content, profile);

      logger.info('Content safety validation completed', {
        isSafe: safetyResult.isSafe,
        score: safetyResult.score,
        issueCount: safetyResult.issues.length,
      });

      res.status(200).json({
        result: safetyResult,
        validatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Content safety validation failed', { error });
      next(createAPIError(
        'Failed to validate content safety',
        'SAFETY_VALIDATION_ERROR',
        500
      ));
    }
  }

  /**
   * Get story themes (static data)
   */
  static async getThemes(_req: Request, res: Response): Promise<void> {
    const themes = {
      themes: [
        {
          id: 'adventure',
          name: 'Adventure',
          description: 'Exciting journeys and discoveries',
          ageRange: '3-12',
        },
        {
          id: 'friendship',
          name: 'Friendship',
          description: 'Stories about making and keeping friends',
          ageRange: '3-10',
        },
        {
          id: 'family',
          name: 'Family',
          description: 'Heartwarming family stories',
          ageRange: '3-8',
        },
        {
          id: 'animals',
          name: 'Animal Friends',
          description: 'Stories featuring friendly animals',
          ageRange: '3-8',
        },
        {
          id: 'imagination',
          name: 'Imagination',
          description: 'Creative and fantastical adventures',
          ageRange: '4-12',
        },
        {
          id: 'kindness',
          name: 'Kindness',
          description: 'Stories about being kind and helpful',
          ageRange: '3-10',
        },
        {
          id: 'nature',
          name: 'Nature',
          description: 'Exploration of the natural world',
          ageRange: '4-12',
        },
        {
          id: 'calming',
          name: 'Calming',
          description: 'Peaceful stories for bedtime',
          ageRange: '3-8',
        },
      ],
      lastUpdated: new Date().toISOString(),
    };

    res.status(200).json(themes);
  }

  /**
   * Get story queue with previews
   */
  static async getStoryQueue(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // This would typically fetch from a queue service
      // For now, return a mock response
      const queue = {
        stories: [],
        totalCount: 0,
        generatedAt: new Date().toISOString(),
        message: 'Queue system not yet implemented - use /api/stories/generate instead',
      };

      res.status(200).json(queue);
    } catch (error) {
      logger.error('Failed to get story queue', { error });
      next(createAPIError(
        'Failed to retrieve story queue',
        'QUEUE_ERROR',
        500
      ));
    }
  }
}
