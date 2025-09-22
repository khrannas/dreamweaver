import { ChildProfile, SavedStory, SavedStorySegment } from '../types/index.js';

export class PromptBuilder {
  /**
   * Build prompt for generating 3 story options with variance
   */
  static buildStoryOptionsPrompt(profile: ChildProfile, count: number = 3): string {
    // Generate varied story summaries with different energy levels, themes, and titles
    const energyLevels = ['high', 'medium', 'calming'];
    const themes = ['adventure', 'friendship', 'imagination', 'nature', 'kindness', 'family'];

    return `You are StoryMagic, a children's bedtime story generator. Create ${count} unique story options for a ${profile.age}-year-old child named [CHILD_NAME].

IMPORTANT: Use [CHILD_NAME] as placeholder for the child's name in ALL story content. Never use the actual name.

Child Profile (use ALL of this information in stories):
- Age: ${profile.age}
- Favorite Animal: ${profile.favoriteAnimal}
- Favorite Color: ${profile.favoriteColor}
${profile.bestFriend ? `- Best Friend: ${profile.bestFriend}` : ''}
${profile.currentInterest ? `- Current Interest: ${profile.currentInterest}` : ''}

Requirements:
- Each story must feature [CHILD_NAME] as the main character/hero
- Stories should be 200-600 words (5-15 minutes reading)
- Include 2-3 meaningful choice points for interactivity
- Use sleep-optimized structure: Engagement → Transition → Wind-down
- Age-appropriate language and themes
- End with calming, sleep-positive imagery
- Create VARIANCE: Each story should have different energy level, theme, and title style

ENERGY LEVEL VARIANCE: ${energyLevels.join(', ')}
THEME VARIANCE: ${themes.join(', ')}

Return EXACTLY ${count} story options in this STRICT format (one after another):

STORY 1:
TITLE: [unique, engaging title using [CHILD_NAME]]
DESCRIPTION: [detailed 2-3 sentence description using [CHILD_NAME] placeholder and incorporating ALL profile details - favorite animal, color, best friend, current interest]
DURATION: [8-12]
ENERGY: [one of: high,medium,calming]
TAGS: [3 relevant tags from: adventure,friendship,imagination,nature,kindness,family,animals]

STORY 2:
[same format]

STORY 3:
[same format]

IMPORTANT: Each field MUST be on its own line. Do NOT include "DURATION:" or any field names in the DESCRIPTION. Return ONLY the story options, no additional text or explanations.`;
  }

  /**
   * Build prompt for generating full story content with branching
   */
  static buildFullStoryPrompt(profile: ChildProfile, storyOption: {
    title: string;
    description: string;
    energyLevel: string;
  }, choices?: Record<string, string>): string {
    const choiceInstructions = choices && Object.keys(choices).length > 0
      ? `\nPrevious Choices Made (continue story from these decisions):\n${Object.entries(choices).map(([choiceId, selectedChoice]) =>
        `- Choice ${choiceId}: ${selectedChoice}`
      ).join('\n')}`
      : '';

    return `You are StoryMagic, creating a personalized bedtime story for [CHILD_NAME], age ${profile.age}.

IMPORTANT: Use [CHILD_NAME] as placeholder for the child's name in ALL story content. Never use the actual name.

Story Title: ${storyOption.title}
Story Description: ${storyOption.description}
Energy Level: ${storyOption.energyLevel}

Child Profile (incorporate ALL of this information naturally):
- Age: ${profile.age}
- Favorite Animal: ${profile.favoriteAnimal}
- Favorite Color: ${profile.favoriteColor}
${profile.bestFriend ? `- Best Friend: ${profile.bestFriend}` : ''}
${profile.currentInterest ? `- Current Interest: ${profile.currentInterest}` : ''}${choiceInstructions}

STORY REQUIREMENTS:
- Write in engaging, narrative style suitable for bedtime reading
- Include **bold text** for emphasis and sound effects (*italics* for thoughts)
- Use age-appropriate vocabulary for ages 3-8
- Generate ONLY the initial story segment (150-300 words) that ends with the FIRST choice point
- Do NOT continue the story beyond the first choice - stop after presenting the first choice point

INTERACTIVE BRANCHING:
- Present exactly ONE meaningful choice point at the end of this initial segment
- The choice must offer two distinct paths that will lead to different story outcomes
- Do NOT write what happens after the choice is made
- End the story segment with the choice point presentation

STORY STRUCTURE:
**Initial Segment Only:** Create an engaging opening that builds excitement and naturally leads to the first choice point

CHILD INTEGRATION:
- [CHILD_NAME] is the main character throughout the ENTIRE story
- Naturally incorporate ALL profile elements: ${profile.favoriteAnimal}, ${profile.favoriteColor}${profile.bestFriend ? `, ${profile.bestFriend}` : ''}${profile.currentInterest ? `, ${profile.currentInterest}` : ''}
- Make the story feel deeply personal and magical

SAFETY REQUIREMENTS:
- No scary content, violence, or frightening themes
- Positive, uplifting message about kindness and friendship
- End with comforting, sleep-positive conclusion

CHOICE POINTS FORMAT (exactly 2 points):
**Choice Point 1:** [Situation description where [CHILD_NAME] must decide]
- Option A: [First meaningful choice with clear consequences]
- Option B: [Second meaningful choice with different consequences]

**Choice Point 2:** [Later situation that builds on previous choice, creating branching narrative]
- Option A: [First choice continuing from Choice Point 1 decision]
- Option B: [Second choice continuing from Choice Point 1 decision]

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

  /**
   * Build prompt for continuing a story based on a choice selection
   */
  static buildStoryContinuationPrompt(
    profile: ChildProfile,
    story: SavedStory,
    currentSegment: SavedStorySegment,
    selectedChoice: { id: string; text: string; outcome: string }
  ): string {
    return `You are StoryMagic, continuing a personalized bedtime story for [CHILD_NAME], age ${profile.age}.

IMPORTANT: Use [CHILD_NAME] as placeholder for the child's name in ALL story content. Never use the actual name.

Story Title: ${story.title}
Previous Story Content: ${currentSegment.content}

The child just made this choice: "${selectedChoice.text}"
Expected outcome: ${selectedChoice.outcome}

Child Profile (incorporate ALL of this information naturally):
- Age: ${profile.age}
- Favorite Animal: ${profile.favoriteAnimal}
- Favorite Color: ${profile.favoriteColor}
${profile.bestFriend ? `- Best Friend: ${profile.bestFriend}` : ''}
${profile.currentInterest ? `- Current Interest: ${profile.currentInterest}` : ''}

CONTINUATION REQUIREMENTS:
- Continue the story seamlessly from where it left off
- Make the choice's consequences clear and meaningful
- Keep the same tone and style as the original story
- Include [CHILD_NAME] as the main character throughout
- Maintain age-appropriate content for ages 3-8
- End this segment appropriately (can include another choice point or conclusion)
- Keep length to 200-400 words for this continuation segment

BRANCHING LOGIC:
- The story should branch based on the choice: ${selectedChoice.text}
- Show how this choice affects [CHILD_NAME]'s adventure
- Create a satisfying continuation that matches the choice's outcome

STORY STRUCTURE:
- Pick up immediately after the choice
- Show the immediate consequences
- Continue the adventure with appropriate pacing
- End at a natural stopping point

IMPORTANT: Respond ONLY with the story continuation content. No metadata, explanations, or notes. Just the story text ready for reading to a child.

Story Continuation:`;
  }
}
