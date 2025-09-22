import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { ChildProfile, StoryOption, StoryContent, ChoicePoint } from '../types/index.js';

export interface SavedStory {
    id: string;
    userId: string;
    childProfileId: string;
    title: string;
    description: string;
    estimatedDuration: number;
    energyLevel: 'high' | 'medium' | 'calming';
    contentTags: string[];
    preview: string;
    createdAt: string;
    updatedAt: string;
    childProfile?: ChildProfile;
}

export interface SavedStorySegment {
    id: string;
    storyId: string;
    parentSegmentId?: string;
    content: string;
    choiceText?: string;
    choiceId?: string;
    segmentOrder: number;
    hasChoices: boolean;
    createdAt: string;
    choicePoints?: ChoicePoint[] | undefined;
}

export interface UserPreferences {
    userId: string;
    theme: 'light' | 'dark';
    volume: number;
    textSize: number;
    updatedAt: string;
}

export class DatabaseService {
    private static get db() {
        return getDatabase();
    }

    /**
     * Save a child profile
     */
    static saveChildProfile(profile: ChildProfile): void {
        try {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO child_profiles
        (id, user_id, name, age, favorite_animal, favorite_color, best_friend, current_interest, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

            stmt.run(
                profile.id,
                'default_user',
                profile.name,
                profile.age,
                profile.favoriteAnimal,
                profile.favoriteColor,
                profile.bestFriend,
                profile.currentInterest
            );

            logger.info('Child profile saved', { profileId: profile.id, name: profile.name });
        } catch (error) {
            logger.error('Failed to save child profile', { error, profileId: profile.id });
            throw error;
        }
    }

    /**
     * Get a child profile by ID
     */
    static getChildProfile(profileId: string): ChildProfile | null {
        try {
            const stmt = this.db.prepare(`
        SELECT id, name, age, favorite_animal, favorite_color, best_friend, current_interest
        FROM child_profiles
        WHERE id = ? AND user_id = ?
      `);

            const row = stmt.get(profileId, 'default_user') as any;
            if (!row) return null;

            return {
                id: row.id,
                name: row.name,
                age: row.age,
                favoriteAnimal: row.favorite_animal,
                favoriteColor: row.favorite_color,
                bestFriend: row.best_friend,
                currentInterest: row.current_interest,
            };
        } catch (error) {
            logger.error('Failed to get child profile', { error, profileId });
            throw error;
        }
    }

    /**
     * Get all child profiles for a user
     */
    static getChildProfiles(): ChildProfile[] {
        try {
            const stmt = this.db.prepare(`
        SELECT id, name, age, favorite_animal, favorite_color, best_friend, current_interest
        FROM child_profiles
        WHERE user_id = ?
        ORDER BY created_at DESC
      `);

            const rows = stmt.all('default_user') as any[];
            return rows.map(row => ({
                id: row.id,
                name: row.name,
                age: row.age,
                favoriteAnimal: row.favorite_animal,
                favoriteColor: row.favorite_color,
                bestFriend: row.best_friend,
                currentInterest: row.current_interest,
            }));
        } catch (error) {
            logger.error('Failed to get child profiles', { error });
            throw error;
        }
    }

    /**
     * Save a complete story with its segments and choices
     */
    static saveStory(
        storyOption: StoryOption,
        childProfileId: string,
        _storyContent: StoryContent,
        segments: SavedStorySegment[]
    ): string {
        try {
            const db = this.db;

            // Begin transaction
            const transaction = db.transaction(() => {
                try {
                    // Insert story
                    const storyStmt = db.prepare(`
            INSERT INTO stories
            (id, user_id, child_profile_id, title, description, estimated_duration, energy_level, content_tags, preview)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

                    const storyResult = storyStmt.run(
                        storyOption.id,
                        'default_user',
                        childProfileId,
                        storyOption.title,
                        storyOption.description,
                        storyOption.estimatedDuration,
                        storyOption.energyLevel,
                        JSON.stringify(storyOption.contentTags),
                        storyOption.preview
                    );

                    console.log('Story inserted:', storyResult);
                } catch (storyError) {
                    console.error('Failed to insert story:', storyError);
                    throw storyError;
                }

                // Insert story segments
                const segmentStmt = db.prepare(`
          INSERT INTO story_segments
          (id, story_id, parent_segment_id, content, choice_text, choice_id, segment_order, has_choices)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

                const choiceStmt = db.prepare(`
          INSERT INTO choice_points
          (id, segment_id, choice_text, choice_order)
          VALUES (?, ?, ?, ?)
        `);

                const choiceOptionStmt = db.prepare(`
          INSERT INTO choice_options
          (id, choice_point_id, option_id, option_text, option_order)
          VALUES (?, ?, ?, ?, ?)
        `);

                try {
                    segments.forEach((segment, segmentIndex) => {
                        try {
                            console.log(`Segment ${segmentIndex} data:`, {
                                id: segment.id,
                                storyId: segment.storyId,
                                parentSegmentId: segment.parentSegmentId,
                                content: segment.content?.substring(0, 50) + '...',
                                choiceText: segment.choiceText,
                                choiceId: segment.choiceId,
                                segmentOrder: segment.segmentOrder,
                                hasChoices: segment.hasChoices,
                                contentType: typeof segment.content,
                                segmentOrderType: typeof segment.segmentOrder
                            });

                            const segmentResult = segmentStmt.run(
                                segment.id,
                                segment.storyId,
                                segment.parentSegmentId || null,
                                segment.content,
                                segment.choiceText || null,
                                segment.choiceId || null,
                                segment.segmentOrder,
                                segment.hasChoices ? 1 : 0
                            );
                            console.log(`Segment ${segmentIndex} inserted:`, segmentResult);

                            // Insert choice points if they exist
                            if (segment.choicePoints && segment.choicePoints.length > 0) {
                                console.log(`Segment ${segmentIndex} has ${segment.choicePoints.length} choice points`);
                                segment.choicePoints.forEach((choice, choiceIndex) => {
                                    try {
                                        console.log(`Inserting choice point: id=${choice.id}, segmentId=${segment.id}, choiceIndex=${choiceIndex}`);
                                        const choiceResult = choiceStmt.run(
                                            choice.id,
                                            segment.id,
                                            choice.text,
                                            choiceIndex
                                        );
                                        console.log(`Choice ${choiceIndex} for segment ${segmentIndex} inserted:`, choiceResult);

                                        // Insert choice options if they exist
                                        if (choice.choices && choice.choices.length > 0) {
                                            choice.choices.forEach((option, optionIndex) => {
                                                try {
                                                    const optionId = `${choice.id}_option_${option.id}`;
                                                    const optionResult = choiceOptionStmt.run(
                                                        optionId,
                                                        choice.id,
                                                        option.id,
                                                        option.text,
                                                        optionIndex
                                                    );
                                                    console.log(`Choice option ${option.id} for choice ${choice.id} inserted:`, optionResult);
                                                } catch (optionError) {
                                                    console.error(`Failed to insert choice option ${option.id} for choice ${choice.id}:`, optionError);
                                                    throw optionError;
                                                }
                                            });
                                        }
                                    } catch (choiceError) {
                                        console.error(`Failed to insert choice ${choiceIndex} for segment ${segmentIndex} (id: ${choice.id}):`, choiceError);
                                        throw choiceError;
                                    }
                                });
                            } else {
                                console.log(`Segment ${segmentIndex} has no choice points`);
                            }
                        } catch (segmentError) {
                            console.error(`Failed to insert segment ${segmentIndex}:`, segmentError);
                            throw segmentError;
                        }
                    });
                } catch (segmentsError) {
                    console.error('Failed to insert segments:', segmentsError);
                    throw segmentsError;
                }
            });

            try {
                transaction();
                console.log('Transaction completed successfully');
            } catch (transactionError) {
                console.error('Transaction failed:', transactionError);
                throw transactionError;
            }

            logger.info('Story saved successfully', {
                storyId: storyOption.id,
                segmentsCount: segments.length
            });

            return storyOption.id;
        } catch (error) {
            logger.error('Failed to save story', { error, storyId: storyOption.id });
            throw error;
        }
    }

    /**
     * Get all saved stories for a user
     */
    static getSavedStories(): SavedStory[] {
        try {
            const stmt = this.db.prepare(`
        SELECT
          s.id, s.user_id, s.child_profile_id, s.title, s.description,
          s.estimated_duration, s.energy_level, s.content_tags, s.preview,
          s.created_at, s.updated_at,
          cp.name as child_name, cp.age as child_age,
          cp.favorite_animal, cp.favorite_color, cp.best_friend, cp.current_interest
        FROM stories s
        LEFT JOIN child_profiles cp ON s.child_profile_id = cp.id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
      `);

            const rows = stmt.all('default_user') as any[];
            return rows.map(row => ({
                id: row.id,
                userId: row.user_id,
                childProfileId: row.child_profile_id,
                title: row.title,
                description: row.description,
                estimatedDuration: row.estimated_duration,
                energyLevel: row.energy_level,
                contentTags: JSON.parse(row.content_tags),
                preview: row.preview,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                childProfile: {
                    id: row.child_profile_id,
                    name: row.child_name,
                    age: row.child_age,
                    favoriteAnimal: row.favorite_animal,
                    favoriteColor: row.favorite_color,
                    bestFriend: row.best_friend,
                    currentInterest: row.current_interest,
                }
            }));
        } catch (error) {
            logger.error('Failed to get saved stories', { error });
            throw error;
        }
    }

    /**
     * Get a specific story by ID
     */
    static getStory(storyId: string): SavedStory | null {
        try {
            const stmt = this.db.prepare(`
        SELECT
          s.id, s.user_id, s.child_profile_id, s.title, s.description,
          s.estimated_duration, s.energy_level, s.content_tags, s.preview,
          s.created_at, s.updated_at,
          cp.name as child_name, cp.age as child_age,
          cp.favorite_animal, cp.favorite_color, cp.best_friend, cp.current_interest
        FROM stories s
        LEFT JOIN child_profiles cp ON s.child_profile_id = cp.id
        WHERE s.id = ? AND s.user_id = ?
      `);

            const row = stmt.get(storyId, 'default_user') as any;
            if (!row) return null;

            return {
                id: row.id,
                userId: row.user_id,
                childProfileId: row.child_profile_id,
                title: row.title,
                description: row.description,
                estimatedDuration: row.estimated_duration,
                energyLevel: row.energy_level,
                contentTags: JSON.parse(row.content_tags),
                preview: row.preview,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                childProfile: {
                    id: row.child_profile_id,
                    name: row.child_name,
                    age: row.child_age,
                    favoriteAnimal: row.favorite_animal,
                    favoriteColor: row.favorite_color,
                    bestFriend: row.best_friend,
                    currentInterest: row.current_interest,
                }
            };
        } catch (error) {
            logger.error('Failed to get story', { error, storyId });
            throw error;
        }
    }

    /**
     * Get story segments for a story
     */
    static getStorySegments(storyId: string): SavedStorySegment[] {
        try {
            // Get segments
            const segmentStmt = this.db.prepare(`
        SELECT id, story_id, parent_segment_id, content, choice_text, choice_id, segment_order, has_choices, created_at
        FROM story_segments
        WHERE story_id = ?
        ORDER BY segment_order ASC
      `);

            const segments = segmentStmt.all(storyId) as any[];

            // Get choice points for each segment
            const choiceStmt = this.db.prepare(`
        SELECT id, segment_id, choice_text, choice_order
        FROM choice_points
        WHERE segment_id = ?
        ORDER BY choice_order ASC
      `);

            // Get choice options for each choice point
            const choiceOptionStmt = this.db.prepare(`
        SELECT id, choice_point_id, option_id, option_text, option_order
        FROM choice_options
        WHERE choice_point_id = ?
        ORDER BY option_order ASC
      `);

            return segments.map(segment => {
                const choices = choiceStmt.all(segment.id) as any[];
                const choicePoints: ChoicePoint[] = choices.map(choice => {
                    const options = choiceOptionStmt.all(choice.id) as any[];
                    return {
                        id: choice.id,
                        text: choice.choice_text,
                        choices: options.map(option => ({
                            id: option.option_id,
                            text: option.option_text,
                            outcome: 'This choice leads to an exciting adventure!' // Default outcome
                        }))
                    };
                });

                return {
                    id: segment.id,
                    storyId: segment.story_id,
                    parentSegmentId: segment.parent_segment_id,
                    content: segment.content,
                    choiceText: segment.choice_text,
                    choiceId: segment.choice_id,
                    segmentOrder: segment.segment_order,
                    hasChoices: segment.has_choices,
                    createdAt: segment.created_at,
                    choicePoints: choicePoints.length > 0 ? choicePoints : undefined
                };
            });
        } catch (error) {
            logger.error('Failed to get story segments', { error, storyId });
            throw error;
        }
    }

    /**
     * Save additional story segments (for continuations)
     */
    static saveStorySegments(segments: SavedStorySegment[]): void {
        try {
            const db = this.db;

            // Begin transaction
            const transaction = db.transaction(() => {
                // Insert story segments
                const segmentStmt = db.prepare(`
          INSERT INTO story_segments
          (id, story_id, parent_segment_id, content, choice_text, choice_id, segment_order, has_choices)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

                // Insert choice points
                const choiceStmt = db.prepare(`
          INSERT INTO choice_points
          (id, segment_id, choice_text, choice_order)
          VALUES (?, ?, ?, ?)
        `);

                segments.forEach((segment, segmentIndex) => {
                    console.log(`Inserting segment ${segmentIndex}:`, segment.id);
                    segmentStmt.run(
                        segment.id,
                        segment.storyId,
                        segment.parentSegmentId || null,
                        segment.content,
                        segment.choiceText || null,
                        segment.choiceId || null,
                        segment.segmentOrder,
                        segment.hasChoices ? 1 : 0
                    );

                    // Insert choice points if they exist
                    if (segment.choicePoints && segment.choicePoints.length > 0) {
                        console.log(`Segment ${segmentIndex} has ${segment.choicePoints.length} choice points`);
                        segment.choicePoints.forEach((choice, choiceIndex) => {
                            console.log(`Inserting choice point: id=${choice.id}, segmentId=${segment.id}`);
                            choiceStmt.run(
                                choice.id,
                                segment.id,
                                choice.text,
                                choiceIndex
                            );
                        });
                    }
                });
            });

            transaction();

            logger.info('Story segments saved successfully', {
                segmentsCount: segments.length
            });

        } catch (error) {
            logger.error('Failed to save story segments', { error });
            throw error;
        }
    }

    /**
     * Get user preferences
     */
    static getUserPreferences(): UserPreferences {
        try {
            const stmt = this.db.prepare(`
        SELECT user_id, theme, volume, text_size, updated_at
        FROM user_preferences
        WHERE user_id = ?
      `);

            const row = stmt.get('default_user') as any;
            if (row) {
                return {
                    userId: row.user_id,
                    theme: row.theme,
                    volume: row.volume,
                    textSize: row.text_size,
                    updatedAt: row.updated_at
                };
            }

            // Return defaults if no preferences exist
            return {
                userId: 'default_user',
                theme: 'light',
                volume: 0.8,
                textSize: 1.0,
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Failed to get user preferences', { error });
            throw error;
        }
    }

    /**
     * Save user preferences
     */
    static saveUserPreferences(preferences: Partial<UserPreferences>): void {
        try {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_preferences
        (user_id, theme, volume, text_size, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

            const current = this.getUserPreferences();

            stmt.run(
                'default_user',
                preferences.theme ?? current.theme,
                preferences.volume ?? current.volume,
                preferences.textSize ?? current.textSize
            );

            logger.info('User preferences saved');
        } catch (error) {
            logger.error('Failed to save user preferences', { error });
            throw error;
        }
    }

    /**
     * Delete a story and all its segments
     */
    static deleteStory(storyId: string): void {
        try {
            const stmt = this.db.prepare(`
        DELETE FROM stories WHERE id = ? AND user_id = ?
      `);

            const result = stmt.run(storyId, 'default_user');
            if (result.changes > 0) {
                logger.info('Story deleted successfully', { storyId });
            } else {
                logger.warn('Story not found or not owned by user', { storyId });
            }
        } catch (error) {
            logger.error('Failed to delete story', { error, storyId });
            throw error;
        }
    }
}
