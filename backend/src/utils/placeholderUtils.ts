import { ChildProfile } from '../types/index.js';

/**
 * Replace placeholders in story content with actual child profile data
 */
export class PlaceholderUtils {
    /**
     * Replace [CHILD_NAME] and other placeholders with actual values
     */
    static replacePlaceholders(content: string, profile: ChildProfile): string {
        let result = content;

        // Replace child name placeholder
        result = result.replace(/\[CHILD_NAME\]/g, profile.name);

        // Replace other profile-specific placeholders if they exist
        result = result.replace(/\[CHILD_AGE\]/g, profile.age.toString());
        result = result.replace(/\[FAVORITE_ANIMAL\]/g, profile.favoriteAnimal);
        result = result.replace(/\[FAVORITE_COLOR\]/g, profile.favoriteColor);

        if (profile.bestFriend) {
            result = result.replace(/\[BEST_FRIEND\]/g, profile.bestFriend);
        }

        if (profile.currentInterest) {
            result = result.replace(/\[CURRENT_INTEREST\]/g, profile.currentInterest);
        }

        return result;
    }

    /**
     * Replace placeholders in story option (title, description, preview)
     */
    static replaceStoryOptionPlaceholders(storyOption: {
        id: string;
        title: string;
        description: string;
        estimatedDuration: number;
        energyLevel: 'high' | 'medium' | 'calming';
        contentTags: string[];
        preview: string;
    }, profile: ChildProfile) {
        return {
            ...storyOption,
            title: this.replacePlaceholders(storyOption.title, profile),
            description: this.replacePlaceholders(storyOption.description, profile),
            preview: this.replacePlaceholders(storyOption.preview, profile),
        };
    }

    /**
     * Replace placeholders in full story content
     */
    static replaceStoryContentPlaceholders(storyContent: {
        id: string;
        title: string;
        content: string;
        choicePoints: any[];
        duration: number;
        energyLevel: 'high' | 'medium' | 'calming';
        contentTags: string[];
    }, profile: ChildProfile) {
        return {
            ...storyContent,
            title: this.replacePlaceholders(storyContent.title, profile),
            content: this.replacePlaceholders(storyContent.content, profile),
            choicePoints: storyContent.choicePoints.map(choicePoint => ({
                ...choicePoint,
                text: this.replacePlaceholders(choicePoint.text, profile),
                choices: choicePoint.choices?.map((choice: any) => ({
                    ...choice,
                    text: this.replacePlaceholders(choice.text, profile),
                    outcome: choice.outcome ? this.replacePlaceholders(choice.outcome, profile) : choice.outcome,
                })) || [],
            })),
        };
    }

    /**
     * Check if content contains placeholders that need replacement
     */
    static hasPlaceholders(content: string): boolean {
        return /\[CHILD_NAME\]|\[CHILD_AGE\]|\[FAVORITE_ANIMAL\]|\[FAVORITE_COLOR\]|\[BEST_FRIEND\]|\[CURRENT_INTEREST\]/.test(content);
    }
}
