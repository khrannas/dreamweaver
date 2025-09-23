import { Request, Response, NextFunction } from 'express';
import {
  GenerateStoriesRequest,
  GenerateStoriesResponse,
  GenerateStoryContentRequest,
  GenerateStoryContentResponse,
  ChildProfile
} from '../types/index.js';
import { StoryGenerationService } from '../services/storyGenerationService.js';
import { DatabaseService, SavedStorySegment, UserPreferences } from '../services/databaseService.js';
import { ContentSafetyService } from '../services/contentSafetyService.js';
import { PlaceholderUtils } from '../utils/placeholderUtils.js';
import { PromptBuilder } from '../services/promptBuilder.js';
import { openRouterClient } from '../config/openai.js';
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

      // Replace placeholders in story previews for immediate display
      const storiesWithReplacedPlaceholders = response.stories.map(story => ({
        ...story,
        preview: PlaceholderUtils.replacePlaceholders(story.preview, requestData.profile),
        title: PlaceholderUtils.replacePlaceholders(story.title, requestData.profile),
        description: PlaceholderUtils.replacePlaceholders(story.description, requestData.profile)
      }));

      logger.info('Story options generated successfully', {
        storyCount: storiesWithReplacedPlaceholders.length,
        childName: requestData.profile.name,
      });

      res.status(200).json({
        ...response,
        stories: storiesWithReplacedPlaceholders
      });
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

      logger.info('Generating story content with placeholder saving', {
        storyId,
        childName: requestData.profile.name,
        hasChoices: !!requestData.choices,
        willSaveToDatabase: true,
      });

      // Save child profile to database first
      await DatabaseService.saveChildProfile(requestData.profile);

      // Use the selected story option from the request
      const storyOption = requestData.storyOption;

      // Generate story content with placeholders
      const response: GenerateStoryContentResponse = await StoryGenerationService.generateStoryContent(
        storyId,
        requestData.profile,
        storyOption,
        requestData.choices
      );

      // Replace placeholders in the story content before sending to frontend
      const storyWithReplacements = PlaceholderUtils.replaceStoryContentPlaceholders(response.story, requestData.profile);

      logger.info('Story content generated successfully', {
        storyId,
        wordCount: storyWithReplacements.content.split(/\s+/).length,
        choicePoints: storyWithReplacements.choicePoints.length,
      });

      res.status(200).json({
        ...response,
        story: storyWithReplacements
      });
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

  /**
   * Save a child profile
   */
  static async saveChildProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile: ChildProfile = req.body;

      if (!validateChildProfile(profile).isValid) {
        const error = createAPIError(
          'Invalid child profile data',
          'VALIDATION_ERROR',
          400,
          { profile }
        );
        res.status(400).json({ error });
        return;
      }

      DatabaseService.saveChildProfile(profile);

      logger.info('Child profile saved', { profileId: profile.id, name: profile.name });
      res.status(201).json({
        success: true,
        profileId: profile.id,
        savedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to save child profile', { error });
      next(createAPIError(
        'Failed to save child profile',
        'DATABASE_ERROR',
        500
      ));
    }
  }

  /**
   * Get all child profiles
   */
  static async getChildProfiles(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profiles = DatabaseService.getChildProfiles();

      res.status(200).json({
        profiles,
        totalCount: profiles.length,
        retrievedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get child profiles', { error });
      next(createAPIError(
        'Failed to retrieve child profiles',
        'DATABASE_ERROR',
        500
      ));
    }
  }

  /**
   * Get a specific child profile
   */
  static async getChildProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;

      if (!profileId) {
        const error = createAPIError(
          'Profile ID is required',
          'VALIDATION_ERROR',
          400
        );
        res.status(400).json({ error });
        return;
      }

      const profile = DatabaseService.getChildProfile(profileId);

      if (!profile) {
        const error = createAPIError(
          'Child profile not found',
          'NOT_FOUND',
          404
        );
        res.status(404).json({ error });
        return;
      }

      res.status(200).json({ profile });
    } catch (error) {
      logger.error('Failed to get child profile', { error, profileId: req.params.profileId });
      next(createAPIError(
        'Failed to retrieve child profile',
        'DATABASE_ERROR',
        500
      ));
    }
  }

  /**
   * Get all saved stories
   */
  static async getSavedStories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stories = DatabaseService.getSavedStories();

      res.status(200).json({
        stories,
        totalCount: stories.length,
        retrievedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get saved stories', { error });
      next(createAPIError(
        'Failed to retrieve saved stories',
        'DATABASE_ERROR',
        500
      ));
    }
  }

  /**
   * Get saved stories with pagination
   */
  static async getSavedStoriesPaginated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Validate pagination parameters
      if (page < 1 || limit < 1 || limit > 50) {
        const error = createAPIError(
          'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 50',
          'VALIDATION_ERROR',
          400
        );
        res.status(400).json({ error });
        return;
      }

      const result = DatabaseService.getSavedStoriesPaginated(page, limit);

      logger.info('Retrieved paginated saved stories', {
        page,
        limit,
        storiesCount: result.stories.length,
        totalCount: result.totalCount,
        hasMore: result.hasMore
      });

      res.status(200).json({
        stories: result.stories,
        pagination: {
          page,
          limit,
          totalCount: result.totalCount,
          hasMore: result.hasMore,
          totalPages: Math.ceil(result.totalCount / limit)
        },
        retrievedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get paginated saved stories', { error });
      next(createAPIError(
        'Failed to retrieve paginated saved stories',
        'DATABASE_ERROR',
        500
      ));
    }
  }

  /**
   * Get a specific saved story with all its segments
   */
  static async getSavedStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { storyId } = req.params;

      if (!storyId) {
        const error = createAPIError(
          'Story ID is required',
          'VALIDATION_ERROR',
          400
        );
        res.status(400).json({ error });
        return;
      }

      const story = DatabaseService.getStory(storyId);
      if (!story) {
        const error = createAPIError(
          'Story not found',
          'NOT_FOUND',
          404
        );
        res.status(404).json({ error });
        return;
      }

      const segments = DatabaseService.getStorySegments(storyId);

      // Replace placeholders with actual child profile data for replay
      const storyWithReplacements = {
        ...story,
        title: PlaceholderUtils.replacePlaceholders(story.title, story.childProfile!),
        description: PlaceholderUtils.replacePlaceholders(story.description, story.childProfile!),
        preview: PlaceholderUtils.replacePlaceholders(story.preview, story.childProfile!),
      };

      const segmentsWithReplacements = segments.map(segment => ({
        ...segment,
        content: PlaceholderUtils.replacePlaceholders(segment.content, story.childProfile!),
        choiceText: segment.choiceText ? PlaceholderUtils.replacePlaceholders(segment.choiceText, story.childProfile!) : segment.choiceText,
        choicePoints: segment.choicePoints?.map(choicePoint => ({
          ...choicePoint,
          text: PlaceholderUtils.replacePlaceholders(choicePoint.text, story.childProfile!),
        })) || undefined,
      }));

      logger.info('Story retrieved for replay with placeholder replacement', {
        storyId,
        childName: story.childProfile?.name,
        segmentsCount: segmentsWithReplacements.length,
        placeholdersReplaced: true
      });

      res.status(200).json({
        story: storyWithReplacements,
        segments: segmentsWithReplacements,
        retrievedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get saved story', { error, storyId: req.params.storyId });
      next(createAPIError(
        'Failed to retrieve saved story',
        'DATABASE_ERROR',
        500
      ));
    }
  }

  /**
   * Delete a saved story
   */
  static async deleteSavedStory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { storyId } = req.params;

      if (!storyId) {
        const error = createAPIError(
          'Story ID is required',
          'VALIDATION_ERROR',
          400
        );
        res.status(400).json({ error });
        return;
      }

      DatabaseService.deleteStory(storyId);

      res.status(200).json({
        success: true,
        storyId,
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to delete saved story', { error, storyId: req.params.storyId });
      next(createAPIError(
        'Failed to delete saved story',
        'DATABASE_ERROR',
        500
      ));
    }
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preferences = DatabaseService.getUserPreferences();

      res.status(200).json({ preferences });
    } catch (error) {
      logger.error('Failed to get user preferences', { error });
      next(createAPIError(
        'Failed to retrieve user preferences',
        'DATABASE_ERROR',
        500
      ));
    }
  }

  /**
   * Save user preferences
   */
  static async saveUserPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preferences: Partial<UserPreferences> = req.body;

      DatabaseService.saveUserPreferences(preferences);

      res.status(200).json({
        success: true,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to save user preferences', { error });
      next(createAPIError(
        'Failed to save user preferences',
        'DATABASE_ERROR',
        500
      ));
    }
  }

  /**
   * Continue story with a choice selection (branching logic)
   */
  /**
   * Get next story segment based on choice selection (generate on-demand if needed)
   */
  static async getNextStorySegment(req: Request, res: Response, next: NextFunction): Promise<void> {
    const storyId = req.params.storyId;
    const { segmentId, choiceId } = req.query;

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
      let nextSegment;
      let profile;

      // Get the story and profile for placeholder replacement
      const story = DatabaseService.getStory(storyId);
      if (!story) {
        const error = createAPIError(
          'Story not found',
          'NOT_FOUND',
          404
        );
        res.status(404).json({ error });
        return;
      }

      profile = DatabaseService.getChildProfile(story.childProfileId);
      if (!profile) {
        const error = createAPIError(
          'Story or profile not found',
          'NOT_FOUND',
          404
        );
        res.status(404).json({ error });
        return;
      }

      if (!segmentId) {
        // Get initial segment
        nextSegment = DatabaseService.getStorySegments(storyId)[0];
      } else if (choiceId && segmentId) {
        // First, try to find existing continuation
        const allSegments = DatabaseService.getStorySegments(storyId);
        nextSegment = allSegments.find(s =>
          s.parentSegmentId === segmentId && s.choiceId === choiceId
        );

        // If not found, generate it on-demand
        if (!nextSegment) {
          const parentSegment = allSegments.find(s => s.id === segmentId);
          if (!parentSegment) {
            const error = createAPIError(
              'Parent segment not found',
              'NOT_FOUND',
              404
            );
            res.status(404).json({ error });
            return;
          }

          // Generate continuation using the already retrieved story and profile

          // Find the selected choice
          logger.info('Looking for choice', {
            choiceId,
            availableChoices: parentSegment.choicePoints?.map(cp =>
              cp.choices.map(c => ({ id: c.id, text: c.text.substring(0, 50) + '...' }))
            )
          });

          const selectedChoice = parentSegment.choicePoints?.find(cp =>
            cp.choices.some(c => c.id === choiceId)
          )?.choices.find(c => c.id === choiceId);

          if (!selectedChoice) {
            logger.error('Choice not found', {
              choiceId,
              segmentId,
              availableChoiceIds: parentSegment.choicePoints?.flatMap(cp => cp.choices.map(c => c.id))
            });
            const error = createAPIError(
              'Choice not found in segment',
              'VALIDATION_ERROR',
              400
            );
            res.status(400).json({ error });
            return;
          }

          logger.info('Generating continuation on-demand', {
            storyId,
            segmentId,
            choiceId
          });

          // Generate continuation
          const continuationResult = await StoryGenerationService.generateChoiceContinuation(
            profile,
            story,
            parentSegment,
            selectedChoice
          );

          // Create and save the continuation segment
          const segmentCounter = allSegments.length;
          const continuationSegment: SavedStorySegment = {
            id: `${storyId}_segment_${segmentCounter + 1}`,
            storyId,
            parentSegmentId: segmentId as string,
            content: continuationResult.content,
            choiceText: selectedChoice.text,
            choiceId: selectedChoice.id,
            segmentOrder: segmentCounter,
            hasChoices: continuationResult.choicePoints && continuationResult.choicePoints.length > 0,
            createdAt: new Date().toISOString(),
            choicePoints: continuationResult.choicePoints || []
          };

          // Save the new segment
          DatabaseService.saveStorySegments([continuationSegment]);
          nextSegment = continuationSegment;

          logger.info('Continuation generated and saved', {
            storyId,
            newSegmentId: continuationSegment.id,
            choiceId
          });
        }
      }

      if (!nextSegment) {
        const error = createAPIError(
          'Story segment not found',
          'NOT_FOUND',
          404
        );
        res.status(404).json({ error });
        return;
      }

      // Replace placeholders in the segment content before returning
      const segmentWithReplacements = {
        ...nextSegment,
        content: PlaceholderUtils.replacePlaceholders(nextSegment.content, profile),
        choicePoints: nextSegment.choicePoints?.map(choicePoint => ({
          ...choicePoint,
          text: PlaceholderUtils.replacePlaceholders(choicePoint.text, profile),
          choices: choicePoint.choices?.map(choice => ({
            ...choice,
            text: PlaceholderUtils.replacePlaceholders(choice.text, profile),
            outcome: choice.outcome ? PlaceholderUtils.replacePlaceholders(choice.outcome, profile) : choice.outcome,
          })) || [],
        })) || [],
      };

      logger.info('Retrieved next story segment', {
        storyId,
        segmentId: nextSegment.id,
        choiceId,
        generated: !nextSegment.parentSegmentId ? false : true,
        placeholdersReplaced: true
      });

      res.status(200).json({
        segment: segmentWithReplacements,
        retrievedAt: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get next story segment', { error, storyId, segmentId, choiceId });
      next(createAPIError(
        'Failed to retrieve story segment',
        'DATABASE_ERROR',
        500
      ));
    }
  }

  static async continueStoryWithChoice(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const { choiceId, segmentId, profile } = req.body;

      if (!choiceId || !segmentId || !profile) {
        const error = createAPIError(
          'Choice ID, segment ID, and child profile are required',
          'VALIDATION_ERROR',
          400
        );
        res.status(400).json({ error });
        return;
      }

      logger.info('Continuing story with choice', {
        storyId,
        segmentId,
        choiceId,
        childName: profile.name
      });

      // Get the existing story and segments
      const story = DatabaseService.getStory(storyId);
      if (!story) {
        const error = createAPIError(
          'Story not found',
          'NOT_FOUND',
          404
        );
        res.status(404).json({ error });
        return;
      }

      const segments = DatabaseService.getStorySegments(storyId);
      const currentSegment = segments.find(s => s.id === segmentId);

      if (!currentSegment) {
        const error = createAPIError(
          'Story segment not found',
          'NOT_FOUND',
          404
        );
        res.status(404).json({ error });
        return;
      }

      // Find the selected choice
      const selectedChoice = currentSegment.choicePoints?.find(cp =>
        cp.choices.some(c => c.id === choiceId)
      )?.choices.find(c => c.id === choiceId);

      if (!selectedChoice) {
        const error = createAPIError(
          'Choice not found in segment',
          'VALIDATION_ERROR',
          400
        );
        res.status(400).json({ error });
        return;
      }

      // Generate continuation based on the choice
      const continuationPrompt = PromptBuilder.buildStoryContinuationPrompt(
        profile,
        story as any,
        currentSegment as any,
        selectedChoice
      );

      const aiResponse = await openRouterClient.generateCompletion(continuationPrompt, {
        maxTokens: 1500,
        temperature: 0.7,
      });

      const continuationResult = StoryGenerationService.parseContinuationResponse(aiResponse);

      // Create new segment
      const newSegmentOrder = segments.length;
      const newSegment = {
        id: `${storyId}_segment_${newSegmentOrder + 1}`,
        storyId,
        parentSegmentId: segmentId,
        content: continuationResult.content,
        choiceText: selectedChoice.text,
        choiceId: selectedChoice.id,
        segmentOrder: newSegmentOrder,
        hasChoices: continuationResult.choicePoints.length > 0,
        createdAt: new Date().toISOString(),
        choicePoints: continuationResult.choicePoints
      };

      // Save the new segment
      const newSegments = [...segments, newSegment];
      DatabaseService.saveStory(story, profile.id, {
        ...story,
        content: newSegments.map(s => s.content).join('\n\n')
      } as any, newSegments);

      logger.info('Story continuation generated and saved', {
        storyId,
        newSegmentId: newSegment.id,
        choiceId,
        wordCount: continuationResult.content.split(/\s+/).length
      });

      res.status(200).json({
        segment: {
          ...newSegment,
          content: PlaceholderUtils.replacePlaceholders(newSegment.content, profile)
        },
        generatedAt: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to continue story with choice', { error, storyId });
      next(createAPIError(
        'Failed to continue story',
        'STORY_CONTINUATION_ERROR',
        500
      ));
    }
  }
}
