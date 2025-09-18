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

Create a story idea for ${profile.name}. Return in this exact format:

TITLE: [engaging story title]
DESCRIPTION: [detailed 2-3 sentence description, at least 100 words]
DURATION: [8-12]
ENERGY: [high|medium|calming]
TAGS: [tag1,tag2,tag3]

Return ONLY these 5 lines:`;
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

STORY REQUIREMENTS:
- Write in engaging, narrative style suitable for bedtime reading
- Include **bold text** for emphasis and sound effects (*italics* for thoughts)
- Use age-appropriate vocabulary for ages 3-8
- Keep total length 300-600 words (8-12 minutes reading)
- Include exactly 2 meaningful choice points that affect the story

STORY STRUCTURE:
**Phase 1 - Engagement (40% of story):** Exciting opening that draws child in
**Phase 2 - Transition (30% of story):** Build adventure, include choice points
**Phase 3 - Wind-down (30% of story):** Shift to calming, peaceful resolution

CHILD INTEGRATION:
- ${profile.name} is the main character throughout
- Naturally incorporate: ${profile.favoriteAnimal}, ${profile.favoriteColor}${profile.bestFriend ? `, ${profile.bestFriend}` : ''}${profile.currentInterest ? `, ${profile.currentInterest}` : ''}
- Make the story feel personal and magical

SAFETY REQUIREMENTS:
- No scary content, violence, or frightening themes
- Positive, uplifting message about kindness and friendship
- End with comforting, sleep-positive conclusion

CHOICE POINTS FORMAT:
Include exactly 2 choice points in this format:
**Choice Point 1:** [Situation description]
- Option A: [First choice]
- Option B: [Second choice]

**Choice Point 2:** [Situation description]
- Option A: [First choice]
- Option B: [Second choice]

IMPORTANT: Respond ONLY with the complete story content. No metadata, explanations, or improvement notes. Just the story ready for reading to a child.

Complete Story:`;
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

IMPORTANT: Respond ONLY with the improved story content. Do not include any explanations, metadata, or notes about the improvements. Just provide the complete, improved story text ready for reading to a child.

Improved Story:`;
  }
}
