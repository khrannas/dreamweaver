import { ChildProfile, SavedStory, SavedStorySegment } from '../types/index.js';

export class PromptBuilder {
  /**
   * Build prompt for generating story options with enhanced variance
   */
  static buildStoryOptionsPrompt(profile: ChildProfile, count: number = 3): string {
    // Enhanced energy levels with more nuanced options
    const allEnergyLevels = ['energetic', 'peaceful', 'mystical', 'playful', 'cozy', 'adventurous', 'gentle', 'exciting'];

    // Ensure at least 2 different energy levels by selecting diverse ones
    const selectedEnergyLevels = this.selectDiverseEnergyLevels(allEnergyLevels, count);

    // Expanded themes with more variety
    const allThemes = [
      'adventure', 'friendship', 'imagination', 'nature', 'kindness', 'family',
      'discovery', 'magic', 'animals', 'space', 'underwater', 'forest',
      'problem-solving', 'teamwork', 'creativity', 'exploration', 'mystery'
    ];

    // Select diverse themes to ensure variety
    const selectedThemes = this.selectDiverseThemes(allThemes, count);

    // Different title styles for variety
    const allTitleStyles = [
      'alliterative (e.g., "[CHILD_NAME] and the Amazing Adventure")',
      'descriptive (e.g., "The Day [CHILD_NAME] Discovered Magic")',
      'question-based (e.g., "What Happened When [CHILD_NAME] Found the Secret?")',
      'action-oriented (e.g., "[CHILD_NAME] Saves the Day")',
      'whimsical (e.g., "The Wonderful World of [CHILD_NAME]")'
    ];

    // Select diverse title styles
    const selectedTitleStyles = this.selectDiverseTitleStyles(allTitleStyles, count);

    // Different description styles
    const allDescriptionStyles = [
      'narrative (tell the story setup)',
      'character-focused (emphasize [CHILD_NAME]\'s role)',
      'setting-focused (describe the magical world)',
      'problem-focused (present the challenge to solve)',
      'mystery-focused (hint at secrets to discover)'
    ];

    // Select diverse description styles
    const selectedDescriptionStyles = this.selectDiverseDescriptionStyles(allDescriptionStyles, count);

    return `You are StoryMagic, a children's bedtime story generator. Create ${count} COMPLETELY UNIQUE story options for a ${profile.age}-year-old child named [CHILD_NAME].

IMPORTANT: Use [CHILD_NAME] as placeholder for the child's name in ALL story content. Never use the actual name.

Child Profile (use ALL of this information in stories):
- Age: ${profile.age}
- Favorite Animal: ${profile.favoriteAnimal}
- Favorite Color: ${profile.favoriteColor}
${profile.bestFriend ? `- Best Friend: ${profile.bestFriend}` : ''}
${profile.currentInterest ? `- Current Interest: ${profile.currentInterest}` : ''}

CRITICAL DIVERSITY REQUIREMENTS:
- Each story must have a COMPLETELY DIFFERENT vibe, energy, and theme
- Stories should be 200-600 words (5-15 minutes reading)
- Include 2-3 meaningful choice points for interactivity
- Use sleep-optimized structure: Engagement → Transition → Wind-down
- Age-appropriate language and themes
- End with calming, sleep-positive imagery

AVAILABLE ENERGY LEVELS: ${allEnergyLevels.join(', ')}
AVAILABLE THEMES: ${allThemes.join(', ')}
TITLE STYLES: ${allTitleStyles.join(', ')}
DESCRIPTION STYLES: ${allDescriptionStyles.join(', ')}

STRICT VARIETY INSTRUCTIONS:
- Story 1: Use ${selectedEnergyLevels[0]} energy, ${selectedThemes[0]} theme, ${selectedTitleStyles[0]} title style, ${selectedDescriptionStyles[0]} description style
- Story 2: Use ${selectedEnergyLevels[1]} energy, ${selectedThemes[1]} theme, ${selectedTitleStyles[1]} title style, ${selectedDescriptionStyles[1]} description style
- Story 3: Use ${selectedEnergyLevels[2]} energy, ${selectedThemes[2]} theme, ${selectedTitleStyles[2]} title style, ${selectedDescriptionStyles[2]} description style

TITLE DIVERSITY CONSTRAINTS:
- DO NOT repeat the same keywords across titles (e.g., if Story 1 uses "Race", Stories 2&3 cannot use "Race")
- DO NOT use the same action words (e.g., "Chase", "Race", "Adventure") in multiple titles
- Each title must have a UNIQUE focus: one about discovery, one about friendship, one about problem-solving
- Vary the title structure: use different patterns for each story

INTRODUCTION DIVERSITY CONSTRAINTS:
- CRITICAL: Each story MUST start with a COMPLETELY DIFFERENT opening pattern
- FORBIDDEN: Do NOT use "Deep in the heart of..." for multiple stories
- FORBIDDEN: Do NOT use "One sunny morning, [CHILD_NAME] and their best friend..." for multiple stories
- ASSIGN these UNIQUE opening patterns (one per story):
  * Story 1: "Suddenly, a [mysterious event] appeared..."
  * Story 2: "[CHILD_NAME] had always dreamed of..."
  * Story 3: "The day started like any other, until..."
- ALTERNATIVE patterns if needed:
  * "A mysterious [object] led [CHILD_NAME] to..."
  * "When [CHILD_NAME] discovered..."
  * "In a world where [magical element]..."
  * "As [CHILD_NAME] explored..."
  * "The moment [CHILD_NAME] found..."
- Each introduction must feel completely different in tone and approach
- NO repeated phrases, words, or sentence structures across stories

Return EXACTLY ${count} story options in this STRICT format (one after another):

STORY 1:
TITLE: [unique, engaging title using [CHILD_NAME] with ${selectedTitleStyles[0]} - MUST be completely different from other titles, no repeated keywords like "Race", "Garden", "Quest"]
DESCRIPTION: [detailed 2-3 sentence description using [CHILD_NAME] placeholder, ${selectedDescriptionStyles[0]} approach, incorporating ALL profile details - favorite animal, color, best friend, current interest. MUST start with "Suddenly, a [mysterious event] appeared..." - NO other opening pattern allowed]
DURATION: [8-12]
ENERGY: [${selectedEnergyLevels[0]}]
TAGS: [3 relevant tags from: adventure,friendship,imagination,nature,kindness,family,animals,discovery,magic,space,underwater,forest,problem-solving,teamwork,creativity,exploration,mystery]

STORY 2:
TITLE: [unique, engaging title using [CHILD_NAME] with ${selectedTitleStyles[1]} - MUST be completely different from other titles, no repeated keywords like "Race", "Garden", "Quest"]
DESCRIPTION: [detailed 2-3 sentence description using [CHILD_NAME] placeholder, ${selectedDescriptionStyles[1]} approach, incorporating ALL profile details - favorite animal, color, best friend, current interest. MUST start with "[CHILD_NAME] had always dreamed of..." - NO other opening pattern allowed]
DURATION: [8-12]
ENERGY: [${selectedEnergyLevels[1]}]
TAGS: [3 relevant tags from: adventure,friendship,imagination,nature,kindness,family,animals,discovery,magic,space,underwater,forest,problem-solving,teamwork,creativity,exploration,mystery]

STORY 3:
TITLE: [unique, engaging title using [CHILD_NAME] with ${selectedTitleStyles[2]} - MUST be completely different from other titles, no repeated keywords like "Race", "Garden", "Quest"]
DESCRIPTION: [detailed 2-3 sentence description using [CHILD_NAME] placeholder, ${selectedDescriptionStyles[2]} approach, incorporating ALL profile details - favorite animal, color, best friend, current interest. MUST start with "The day started like any other, until..." - NO other opening pattern allowed]
DURATION: [8-12]
ENERGY: [${selectedEnergyLevels[2]}]
TAGS: [3 relevant tags from: adventure,friendship,imagination,nature,kindness,family,animals,discovery,magic,space,underwater,forest,problem-solving,teamwork,creativity,exploration,mystery]

CRITICAL REMINDERS:
- Each field MUST be on its own line
- Do NOT include "DURATION:" or any field names in the DESCRIPTION
- TITLES must have NO repeated keywords across the three stories
- DESCRIPTIONS must start with completely different opening patterns
- ENERGY levels must be different (at least 2 different energy levels)
- Return ONLY the story options, no additional text or explanations

VALIDATION CHECKLIST (verify before submitting):
✓ Story 1 title does NOT contain words used in Stories 2&3 titles
✓ Story 2 title does NOT contain words used in Stories 1&3 titles
✓ Story 3 title does NOT contain words used in Stories 1&2 titles
✓ Story 1 description starts with "Suddenly, a [event] appeared..."
✓ Story 2 description starts with "[CHILD_NAME] had always dreamed of..."
✓ Story 3 description starts with "The day started like any other, until..."
✓ At least 2 different energy levels are used
✓ No repeated phrases or sentence structures across stories`;
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
- Keep length to 200-400 words for this continuation segment

BRANCHING LOGIC:
- The story should branch based on the choice: ${selectedChoice.text}
- Show how this choice affects [CHILD_NAME]'s adventure
- Create a satisfying continuation that matches the choice's outcome

STORY STRUCTURE:
- Pick up immediately after the choice
- Show the immediate consequences
- Continue the adventure with appropriate pacing
- End naturally when the story reaches a satisfying conclusion

ENDING OPTIONS:
You have two options for ending this segment:

1. **NATURAL ENDING**: If the story has reached a satisfying conclusion (adventure completed, lesson learned, bedtime ready), end the story naturally without a choice point. Use phrases like "The End" or "And they all lived happily ever after."

2. **CONTINUE WITH CHOICE**: If there's more adventure to be had, end with a choice point in this format:

**Choice Point 1:** [Situation description where [CHILD_NAME] must decide]
- Option A: [First meaningful choice with clear consequences]
- Option B: [Second meaningful choice with different consequences]

IMPORTANT: Respond ONLY with the story continuation content. If you include a choice point, format it exactly as shown above. If the story ends naturally, do not include any choice points.

Story Continuation:`;
  }

  /**
   * Select diverse energy levels ensuring at least 2 different ones
   */
  private static selectDiverseEnergyLevels(allEnergyLevels: string[], count: number): string[] {
    const selected: string[] = [];

    // Ensure we have at least 2 different energy levels with contrasting vibes
    if (count >= 2 && allEnergyLevels.length >= 2) {
      // Select contrasting energy levels: one high-energy, one calm
      selected.push('energetic'); // High energy
      selected.push('peaceful'); // Calm energy

      // For third story, pick something different from the first two
      if (count >= 3) {
        const contrastingOptions = ['mystical', 'playful', 'cozy', 'adventurous', 'gentle', 'exciting'];
        const remaining = contrastingOptions.filter(level => !selected.includes(level));
        if (remaining.length > 0) {
          selected.push(remaining[Math.floor(Math.random() * remaining.length)]!);
        } else {
          selected.push('mystical'); // Fallback
        }
      }
    } else if (allEnergyLevels.length > 0) {
      // If only 1 story, just pick the first one
      selected.push(allEnergyLevels[0]!);
    }

    return selected;
  }

  /**
   * Select diverse themes ensuring variety
   */
  private static selectDiverseThemes(allThemes: string[], count: number): string[] {
    const selected: string[] = [];
    const shuffled = [...allThemes].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const item = shuffled[i];
      if (item) {
        selected.push(item);
      }
    }

    return selected;
  }

  /**
   * Select diverse title styles ensuring variety
   */
  private static selectDiverseTitleStyles(allTitleStyles: string[], count: number): string[] {
    const selected: string[] = [];
    const shuffled = [...allTitleStyles].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const item = shuffled[i];
      if (item) {
        selected.push(item);
      }
    }

    return selected;
  }

  /**
   * Select diverse description styles ensuring variety
   */
  private static selectDiverseDescriptionStyles(allDescriptionStyles: string[], count: number): string[] {
    const selected: string[] = [];
    const shuffled = [...allDescriptionStyles].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const item = shuffled[i];
      if (item) {
        selected.push(item);
      }
    }

    return selected;
  }
}
