import { ChildProfile } from '../types/index.js';

export class PromptBuilder {
  /**
   * Build prompt for generating 3 story options
   */
  static buildStoryOptionsPrompt(profile: ChildProfile, count: number = 3): string {
    return `You are StoryMagic, a children's bedtime story generator. Create ${count} unique story options for a ${profile.age}-year-old child.

Child Profile:
- Name: ${profile.name}
- Favorite Animal: ${profile.favoriteAnimal}
- Favorite Color: ${profile.favoriteColor}
${profile.bestFriend ? `- Best Friend: ${profile.bestFriend}` : ''}
${profile.currentInterest ? `- Current Interest: ${profile.currentInterest}` : ''}

Requirements:
- Each story must feature the child as the main character/hero
- Stories should be 200-600 words (5-15 minutes reading)
- Include 2-3 meaningful choice points for interactivity
- Use sleep-optimized structure: Engagement → Transition → Wind-down
- Age-appropriate language and themes
- End with calming, sleep-positive imagery

Generate ${count} story options, each with:
- Title (engaging for child)
- Brief description (2-3 sentences)
- Estimated duration (5-15 minutes)
- Energy level (high, medium, calming)
- Content tags (adventure, friendship, educational, etc.)

Story Options:`;
  }

  /**
   * Build prompt for generating full story content
   */
  static buildFullStoryPrompt(profile: ChildProfile, storyOption: {
    title: string;
    description: string;
    energyLevel: string;
  }, choices?: Record<string, string>): string {
    const choiceInstructions = choices && Object.keys(choices).length > 0
      ? `\nPrevious Choices Made:\n${Object.entries(choices).map(([choiceId, selectedChoice]) =>
          `- Choice ${choiceId}: ${selectedChoice}`
        ).join('\n')}`
      : '';

    return `You are StoryMagic, creating a personalized bedtime story for ${profile.name}, age ${profile.age}.

Story Title: ${storyOption.title}
Story Description: ${storyOption.description}
Energy Level: ${storyOption.energyLevel}

Child Profile:
- Name: ${profile.name}
- Favorite Animal: ${profile.favoriteAnimal}
- Favorite Color: ${profile.favoriteColor}
${profile.bestFriend ? `- Best Friend: ${profile.bestFriend}` : ''}
${profile.currentInterest ? `- Current Interest: ${profile.currentInterest}` : ''}${choiceInstructions}

Story Structure Requirements:
PHASE 1 - ENGAGEMENT (40% of story): Exciting opening, introduce child as hero
PHASE 2 - TRANSITION (30% of story): Build adventure, include first choice point
PHASE 3 - WIND-DOWN (30% of story): Shift to calming, peaceful resolution

Choice Points: Include exactly 2 choice points that genuinely affect the story outcome.

Child Integration:
- ${profile.name} is the protagonist throughout
- Incorporate ${profile.favoriteAnimal}, ${profile.favoriteColor}${profile.bestFriend ? `, ${profile.bestFriend}` : ''}${profile.currentInterest ? `, ${profile.currentInterest}` : ''} naturally
- Age-appropriate vocabulary (ages 3-8)

Safety Requirements:
- No scary content, violence, or frightening themes
- Positive, uplifting message
- Promote kindness, friendship, and family values
- End with sleep-positive, comforting conclusion

Generate the complete story with embedded choice points.`;
  }

  /**
   * Build prompt for content safety validation
   */
  static buildSafetyCheckPrompt(content: string, age: number): string {
    return `You are a content safety validator for children's stories. Analyze the following story content for age-appropriateness for a ${age}-year-old child.

Story Content:
${content}

Please evaluate:
1. Age-appropriate language and vocabulary
2. Absence of scary, violent, or inappropriate themes
3. Positive, uplifting messages
4. Suitability for bedtime reading

Provide a safety score (0-100) and list any concerns:
- Safety Score: [0-100]
- Concerns: [List any issues or "None"]
- Recommendations: [Any suggested improvements or "None needed"]`;
  }

  /**
   * Build prompt for story improvement suggestions
   */
  static buildImprovementPrompt(content: string, issues: string[]): string {
    return `You are a children's story editor. Review and improve the following bedtime story to address these issues:

Issues to Address:
${issues.map(issue => `- ${issue}`).join('\n')}

Original Story:
${content}

Please provide an improved version that:
1. Addresses all the identified issues
2. Maintains the story's core plot and characters
3. Keeps age-appropriate language
4. Preserves the sleep-optimized structure
5. Includes choice points for interactivity

Improved Story:`;
  }
}
