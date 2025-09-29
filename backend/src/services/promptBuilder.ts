import { ChildProfile, SavedStory, SavedStorySegment } from '../types/index.js';

export class PromptBuilder {
  /**
   * Build prompt for generating story options with enhanced variance
   */
  static buildStoryOptionsPrompt(profile: ChildProfile, count: number = 3): string {
    // Enhanced energy levels with more nuanced options
    const allEnergyLevels = ['energetic', 'peaceful', 'mystical', 'playful', 'cozy', 'adventurous', 'gentle', 'exciting'];

    // Expanded themes with more variety
    const allThemes = [
      'adventure', 'friendship', 'imagination', 'nature', 'kindness', 'family',
      'discovery', 'magic', 'animals', 'space', 'underwater', 'forest',
      'problem-solving', 'teamwork', 'creativity', 'exploration', 'mystery'
    ];

    // Different title styles for variety
    const allTitleStyles = [
      'alliterative (e.g., "[CHILD_NAME] and the Amazing Adventure")',
      'descriptive (e.g., "The Day [CHILD_NAME] Discovered Magic")',
      'question-based (e.g., "What Happened When [CHILD_NAME] Found the Secret?")',
      'action-oriented (e.g., "[CHILD_NAME] Saves the Day")',
      'whimsical (e.g., "The Wonderful World of [CHILD_NAME]")'
    ];

    // Different description styles
    const allDescriptionStyles = [
      'narrative (tell the story setup)',
      "character-focused (emphasize [CHILD_NAME]'s role)",
      'setting-focused (describe the magical world)',
      'problem-focused (present the challenge to solve)',
      'mystery-focused (hint at secrets to discover)'
    ];

    const selectedEnergyLevels = this.selectDiverseEnergyLevels(allEnergyLevels, Math.min(count, 3));
    const selectedThemes = this.selectDiverseThemes(allThemes, Math.min(count, 3));
    const selectedTitleStyles = this.selectDiverseTitleStyles(allTitleStyles, Math.min(count, 3));
    const selectedDescriptionStyles = this.selectDiverseDescriptionStyles(allDescriptionStyles, Math.min(count, 3));

    return `You are StoryMagic, a warm and concise children's bedtime story generator. Create ${count} unique story options for a ${profile.age}-year-old using [CHILD_NAME] as the child name placeholder (do NOT use the real name).

Child details (use these naturally in each option):
- Age: ${profile.age}
- Favorite Animal: ${profile.favoriteAnimal}
- Favorite Color: ${profile.favoriteColor}
${profile.bestFriend ? `- Best Friend: ${profile.bestFriend}` : ''}
${profile.currentInterest ? `- Current Interest: ${profile.currentInterest}` : ''}

Available energy levels: ${allEnergyLevels.join(', ')}
Available themes (examples): ${allThemes.slice(0,8).join(', ')}

Aim for variety. Example approach for the first three options: 
1) ${selectedEnergyLevels[0]} energy • ${selectedThemes[0]} • ${selectedTitleStyles[0]} • ${selectedDescriptionStyles[0]}
2) ${selectedEnergyLevels[1] || allEnergyLevels[1]} energy • ${selectedThemes[1] || allThemes[1]} • ${selectedTitleStyles[1] || allTitleStyles[1]} • ${selectedDescriptionStyles[1] || allDescriptionStyles[1]}
3) ${selectedEnergyLevels[2] || allEnergyLevels[2]} energy • ${selectedThemes[2] || allThemes[2]} • ${selectedTitleStyles[2] || allTitleStyles[2]} • ${selectedDescriptionStyles[2] || allDescriptionStyles[2]}

For each option, return a clearly labeled block in this exact format (one block per story):

STORY <n>:
TITLE: [short, engaging title that may include [CHILD_NAME]]
DESCRIPTION: [2 short sentences (gentle, age-appropriate), include at least one profile detail]
DURATION: [minutes, suggest 8-12]
ENERGY: [one word: energetic | peaceful | mystical | playful | cozy | adventurous | gentle | calming]
TAGS: [2-3 comma-separated keywords]

Requirements:
- Produce exactly ${count} options, numbered 1 to ${count}.
- Each option should feel distinct in theme and energy; avoid repeating core title keywords across options.
- Keep tone comforting and non-scary; no violence, frightening imagery, or adult themes.
- Use simple, clear language suitable for ages 3-8.
- Do NOT add extra commentary or metadata beyond the requested blocks.

Return only the ${count} STORY blocks in the format above.`;
  }

  /**
   * Build prompt for generating a single story with specific constraints
   */
  static buildSingleStoryPrompt(profile: ChildProfile, _storyIndex: number, generalMessage?: string): string {
    const ageStr = profile && profile.age ? `${profile.age}` : 'a young child';
    const themeHint = generalMessage ? `Focus on this message: "${generalMessage}".` : '';

    return `You are StoryMagic, a warm and simple children's story idea generator.
Create ONE clear story summary for a ${ageStr}-year-old using [CHILD_NAME] as a placeholder. ${themeHint}
Output exactly:
TITLE: [a short, engaging title]
DESCRIPTION: [2-3 short sentences that capture the story, gentle tone]
DURATION: [approx minutes]
TAGS: [comma-separated keywords]

Do not include anything else.`;
  }

  /**
   * Build prompt for generating full story content with branching
   */
  static buildFullStoryPrompt(profile: ChildProfile, storyOption: {
    title: string;
    description: string;
    energyLevel: string;
  }, choices?: Record<string, string>): string {
    const ageStr = profile && profile.age ? `${profile.age}` : 'a young child';
    const chosen = storyOption.description || '';
    const prevChoices = choices && Object.keys(choices).length > 0
      ? `Previous choices: ${Object.entries(choices).map(([k,v])=>`${k}: ${v}`).join('; ')}`
      : '';

    return `You are StoryMagic. Write a warm, age-appropriate opening segment for a bedtime story for a ${ageStr}-year-old. Use [CHILD_NAME] as the main character placeholder.
Story Title: ${storyOption.title}
Story Brief: ${chosen}
${prevChoices}

Requirements:
- Write a cozy, engaging opening of 150-300 words.
- End the segment with ONE clear choice point offering two distinct options.
- Keep language simple, non-scary, and suitable for bedtime.
- Do NOT reveal the child's real name.

Respond only with the story text and the choice point in a clear format.`;
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

  /**
   * Return a curated list of 100 general messages/values suitable for children's stories
   */
  static getGeneralMessageRecommendations(): string[] {
    // Curated values/messages parents may want to convey through a story
    return [
      "Be kind to others",
      "Always be curious",
      "Bravery comes in small steps",
      "Share what you have",
      "Be a good friend",
      "Try your best",
      "It's okay to ask for help",
      "Treat animals gently",
      "Say please and thank you",
      "Be honest and kind",
      "You are loved",
      "Celebrate differences",
      "Be brave when you're scared",
      "Listen to your heart",
      "Take care of nature",
      "Learn from mistakes",
      "Help others when you can",
      "Friends help each other",
      "Use your imagination",
      "Small acts matter",
      "Be patient",
      "Be grateful",
      "Respect everyone",
      "Try new things",
      "Family is important",
      "Be gentle with yourself",
      "Be fair",
      "Take turns",
      "Be polite",
      "Ask questions",
      "Stand up for what's right",
      "Keep your promises",
      "Be adventurous",
      "Be creative",
      "Take deep breaths when upset",
      "Believe in yourself",
      "Be a helper",
      "Be a good listener",
      "Be a problem solver",
      "It's okay to feel sad",
      "You can learn anything",
      "Kind words matter",
      "Be a team player",
      "Keep trying",
      "Be mindful",
      "Be respectful",
      "Be curious about the world",
      "Be gentle with nature",
      "Be generous",
      "Take care of others",
      "Dream big",
      "Show empathy",
      "Be brave to say sorry",
      "Be proud of who you are",
      "Honesty builds trust",
      "Be helpful at home",
      "Be a good neighbor",
      "Admit when you're wrong",
      "Take care of your things",
      "Learn to share",
      "Be a kind leader",
      "Be brave to try again",
      "Use kind hands",
      "Learn from others",
      "Make time to play",
      "Be safe",
      "Be a creative thinker",
      "Take care of your feelings",
      "Be a good sport",
      "Encourage friends",
      "Be gentle with animals",
      "Respect grown-ups",
      "Stand by your friends",
      "Be calm in tough times",
      "Be a helper in your community",
      "Speak up kindly",
      "Take on challenges slowly",
      "Be honest about your feelings",
      "Care for the planet",
      "Be patient with learning",
      "Be thankful",
      "Be a peacemaker",
      "Practice kindness every day",
      "Share your imagination",
      "Be thoughtful",
      "Be a curious explorer",
      "Value friendships",
      "Be flexible",
      "Be a caring sibling",
      "Make people smile",
      "Be brave and gentle",
      "Be loyal",
      "Show gratitude",
      "Use your talents for good",
      "Be mindful of others",
      "Be a brave learner",
      "Celebrate small wins"
    ];
  }

  /**
   * Build a simple, elegant prompt to generate short one-sentence story previews.
   * Each preview should be a single sentence (max 30 words) and use [CHILD_NAME] placeholder
   */
  static buildShortPreviewPrompt(profile: any, count: number = 10, generalMessage?: string): string {
    const ageStr = profile && profile.age ? `${profile.age}` : 'a young child';
    const gm = generalMessage ? `Theme/Message: "${generalMessage}".` : '';

    return `You are a gentle and concise children's story idea generator.
Produce exactly ${count} distinct, one-sentence story ideas for a ${ageStr}-year-old child. Each idea must:
- Be exactly one sentence, no lists or extra commentary.
- Be at most 30 words.
- Use the placeholder [CHILD_NAME] if the child's name is necessary.
- Be simple, heartwarming, and suitable for bedtime.
- Optionally incorporate this message if provided: ${gm}

Output format, one per line numbered 1-${count}:
1. [first idea]
2. [second idea]
...
${count}. [last idea]

Do not include anything else.`;
  }
}
