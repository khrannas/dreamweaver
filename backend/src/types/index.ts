// Child Profile Types
export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  favoriteAnimal: string;
  favoriteColor: string;
  bestFriend?: string;
  currentInterest?: string;
}

// Story Types
export interface StoryOption {
  id: string;
  title: string;
  description: string;
  estimatedDuration: number; // in minutes
  energyLevel: 'high' | 'medium' | 'calming';
  contentTags: string[];
  preview: string;
}

export interface ChoicePoint {
  id: string;
  text: string;
  choices: {
    id: string;
    text: string;
    outcome: string;
  }[];
}

export interface StoryContent {
  id: string;
  title: string;
  content: string;
  choicePoints: ChoicePoint[];
  duration: number;
  energyLevel: 'high' | 'medium' | 'calming';
  contentTags: string[];
}

// API Request/Response Types
export interface GenerateStoriesRequest {
  profile: ChildProfile;
  count?: number;
}

export interface GenerateStoriesResponse {
  stories: StoryOption[];
  generatedAt: string;
}

export interface GenerateStoryContentRequest {
  storyId: string;
  profile: ChildProfile;
  choices?: Record<string, string>; // choiceId -> selectedChoiceId
}

export interface GenerateStoryContentResponse {
  story: StoryContent;
  generatedAt: string;
}

// Content Safety Types
export interface SafetyCheckResult {
  isSafe: boolean;
  issues: string[];
  score: number; // 0-100, higher is safer
  recommendations: string[] | undefined;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// API Error Types
export interface APIError extends Error {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
  name: string;
  stack?: string;
}

// Queue Types
export interface StoryQueueItem {
  story: StoryOption;
  priority: number;
  expiresAt: Date;
}

// Saved Story Types (for database operations)
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
  choicePoints?: ChoicePoint[];
}
