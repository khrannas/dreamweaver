import { z } from 'zod';
import { ValidationResult } from '../types/index.js';

// Child Profile Validation Schema
export const childProfileSchema = z.object({
  id: z.union([z.string().uuid(), z.string().min(1)]).optional(),
  name: z.string().min(1).max(50).regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces'),
  age: z.number().int().min(3).max(12, 'Age must be between 3 and 12'),
  favoriteAnimal: z.string().min(1).max(30),
  favoriteColor: z.string().min(1).max(20),
  bestFriend: z.string().max(50).optional(),
  currentInterest: z.string().max(50).optional(),
  createdAt: z.string().optional(),
});

// Story Generation Request Schema
export const generateStoriesRequestSchema = z.object({
  profile: childProfileSchema,
  count: z.number().int().min(1).max(5).optional().default(3),
});

// Story Content Request Schema
export const generateStoryContentRequestSchema = z.object({
  storyId: z.union([z.string().uuid(), z.string().min(1)]),
  profile: childProfileSchema,
  choices: z.record(z.string(), z.string()).optional(),
});

// Content Safety Validation
export const contentSafetySchema = z.object({
  content: z.string().min(1),
  age: z.number().int().min(3).max(12),
});

// Validation Functions
export function validateChildProfile(profile: unknown): ValidationResult {
  try {
    childProfileSchema.parse(profile);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return {
      isValid: false,
      errors: ['Invalid profile data'],
    };
  }
}

export function validateGenerateStoriesRequest(request: unknown): ValidationResult {
  try {
    generateStoriesRequestSchema.parse(request);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return {
      isValid: false,
      errors: ['Invalid request data'],
    };
  }
}

export function validateGenerateStoryContentRequest(request: unknown): ValidationResult {
  try {
    generateStoryContentRequestSchema.parse(request);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return {
      isValid: false,
      errors: ['Invalid request data'],
    };
  }
}

// Age-appropriate content validation
export function validateContentForAge(content: string, age: number): ValidationResult {
  const errors: string[] = [];

  // Check for inappropriate words (basic filtering)
  const inappropriateWords = [
    'violence', 'death', 'scary', 'monster', 'ghost', 'witch',
    'curse', 'poison', 'weapon', 'fight', 'battle', 'war'
  ];

  const lowerContent = content.toLowerCase();
  const foundWords = inappropriateWords.filter(word => lowerContent.includes(word));

  if (foundWords.length > 0) {
    errors.push(`Content contains potentially inappropriate words: ${foundWords.join(', ')}`);
  }

  // Check content length appropriateness
  const wordCount = content.split(/\s+/).length;
  const minWords = age * 20; // Rough estimate: younger kids need shorter content
  const maxWords = age * 80;

  if (wordCount < minWords) {
    errors.push(`Content too short for age ${age} (${wordCount} words, minimum ${minWords})`);
  }

  if (wordCount > maxWords) {
    errors.push(`Content too long for age ${age} (${wordCount} words, maximum ${maxWords})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
