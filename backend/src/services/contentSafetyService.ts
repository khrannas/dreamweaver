import { SafetyCheckResult, ChildProfile } from '../types/index.js';
import { PromptBuilder } from './promptBuilder.js';
import { openRouterClient } from '../config/openai.js';
import { logger } from '../utils/logger.js';
import { validateContentForAge } from '../utils/validation.js';

export class ContentSafetyService {
  /**
   * Comprehensive safety check for story content
   */
  static async checkContentSafety(
    content: string,
    profile: ChildProfile
  ): Promise<SafetyCheckResult> {
    try {
      logger.info('Starting content safety check', { contentLength: content.length });

      // Multi-layer safety validation
      const basicValidation = this.performBasicSafetyChecks(content, profile.age);
      const aiValidation = await this.performAISafetyCheck(content, profile.age);

      // Combine results
      const combinedResult = this.combineSafetyResults(basicValidation, aiValidation);

      logger.info('Content safety check completed', {
        isSafe: combinedResult.isSafe,
        score: combinedResult.score,
        issueCount: combinedResult.issues.length
      });

      return combinedResult;
    } catch (error) {
      logger.error('Content safety check failed', { error });
      return {
        isSafe: false,
        issues: ['Safety check failed - unable to validate content'],
        score: 0,
        recommendations: ['Please try generating the story again']
      };
    }
  }

  /**
   * Basic safety checks (regex-based filtering)
   */
  private static performBasicSafetyChecks(content: string, age: number): SafetyCheckResult {
    const issues: string[] = [];
    const lowerContent = content.toLowerCase();

    // Inappropriate words and themes
    const dangerousWords = [
      // Violence and harm
      'kill', 'die', 'dead', 'death', 'murder', 'fight', 'battle', 'war',
      'weapon', 'gun', 'knife', 'blood', 'hurt', 'pain', 'injury',
      // Scary content
      'monster', 'ghost', 'zombie', 'vampire', 'witch', 'curse', 'haunted',
      'scary', 'terrifying', 'nightmare', 'fear', 'afraid', 'terror',
      // Negative emotions
      'hate', 'evil', 'bad', 'mean', 'cruel', 'angry', 'rage',
      // Adult themes
      'alcohol', 'drugs', 'smoking', 'sex', 'naked', 'bathroom'
    ];

    const foundDangerousWords = dangerousWords.filter(word =>
      lowerContent.includes(word)
    );

    if (foundDangerousWords.length > 0) {
      issues.push(`Contains inappropriate words: ${foundDangerousWords.join(', ')}`);
    }

    // Age validation
    const ageValidation = validateContentForAge(content, age);
    issues.push(...ageValidation.errors);

    // Length check
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 100) {
      issues.push('Story is too short (minimum 100 words)');
    }
    if (wordCount > 800) {
      issues.push('Story is too long (maximum 800 words)');
    }

    // Calculate basic score
    let score = 100;
    score -= foundDangerousWords.length * 20; // -20 per dangerous word
    score -= ageValidation.errors.length * 15; // -15 per validation error
    score = Math.max(0, Math.min(100, score));

    return {
      isSafe: issues.length === 0,
      issues,
      score,
      recommendations: issues.length > 0 ? ['Review and revise content'] : undefined
    };
  }

  /**
   * AI-powered safety validation
   */
  private static async performAISafetyCheck(content: string, age: number): Promise<SafetyCheckResult> {
    try {
      const prompt = PromptBuilder.buildSafetyCheckPrompt(content, age);

      const aiResponse = await openRouterClient.generateCompletion(prompt, {
        maxTokens: 300,
        temperature: 0.1, // Low temperature for consistent analysis
        fallbackToPaid: false // Don't fallback for safety checks
      });

      return this.parseAISafetyResponse(aiResponse);
    } catch (error) {
      logger.warn('AI safety check failed, falling back to basic checks', { error });
      return {
        isSafe: true, // Allow content if AI check fails
        issues: [],
        score: 70, // Conservative score
        recommendations: ['AI safety validation unavailable']
      };
    }
  }

  /**
   * Parse AI safety response
   */
  private static parseAISafetyResponse(response: string): SafetyCheckResult {
    const issues: string[] = [];
    let score = 50; // Default score

    // Extract safety score
    const scoreMatch = response.match(/Safety Score:\s*(\d+)/i);
    if (scoreMatch && scoreMatch[1]) {
      score = parseInt(scoreMatch[1], 10);
      score = Math.max(0, Math.min(100, score));
    }

    // Extract concerns
    const concernsSection = response.match(/Concerns:\s*(.*?)(?:\n\n|$)/is);
    if (concernsSection && concernsSection[1]) {
      const concerns = concernsSection[1].trim();
      if (concerns.toLowerCase() !== 'none') {
        // Split concerns into individual issues
        const concernLines = concerns.split('\n').filter(line => line.trim());
        issues.push(...concernLines.map(line => line.replace(/^[-•*]\s*/, '').trim()));
      }
    }

    // Extract recommendations
    const recommendations: string[] = [];
    const recSection = response.match(/Recommendations:\s*(.*?)(?:\n\n|$)/is);
    if (recSection && recSection[1]) {
      const recs = recSection[1].trim();
      if (recs.toLowerCase() !== 'none needed') {
        const recLines = recs.split('\n').filter(line => line.trim());
        recommendations.push(...recLines.map(line => line.replace(/^[-•*]\s*/, '').trim()));
      }
    }

    return {
      isSafe: score >= 80 && issues.length === 0,
      issues,
      score,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  /**
   * Combine multiple safety check results
   */
  private static combineSafetyResults(
    basicResult: SafetyCheckResult,
    aiResult: SafetyCheckResult
  ): SafetyCheckResult {
    const allIssues = [...basicResult.issues, ...aiResult.issues];
    const allRecommendations = [
      ...(basicResult.recommendations || []),
      ...(aiResult.recommendations || [])
    ];

    // Weighted score combination (basic 40%, AI 60%)
    const combinedScore = Math.round((basicResult.score * 0.4) + (aiResult.score * 0.6));

    return {
      isSafe: basicResult.isSafe && aiResult.isSafe && combinedScore >= 80,
      issues: allIssues,
      score: combinedScore,
      recommendations: allRecommendations.length > 0 ? allRecommendations : undefined
    };
  }

  /**
   * Check if content needs improvement
   */
  static needsImprovement(result: SafetyCheckResult): boolean {
    return result.score < 85 || result.issues.length > 0;
  }
}
