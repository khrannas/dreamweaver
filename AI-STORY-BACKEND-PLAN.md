# AI Story Generator Backend Plan

## Overview
This document outlines the comprehensive plan for implementing a TypeScript backend with AI-powered story generation for the Dreamweaver children's story app. The backend will integrate with OpenRouter to generate personalized, age-appropriate stories while maintaining seamless fallback to the current hardcoded stories.

## Key Decisions

### LLM Selection (Cost-Optimized)
- **Primary Model:** ArliAI QwQ 32B RpR v1 - **Completely FREE** (32B parameter model fine-tuned for creative writing and roleplay)
- **Secondary Fallback:** TheDrummer/Rocinante-12B - Very cheap ($0.0000002 prompt, $0.0000005 completion)
- **Tertiary Backup:** Mistral Nemo 12B Celeste - Low cost alternative ($0.0000008 prompt, $0.0000012 completion)

### Tech Stack
- **Backend:** TypeScript + Express.js
- **Database:** SQLite (simple, file-based, no external dependencies)
- **API Client:** OpenAI SDK (compatible with OpenRouter)
- **Validation:** Zod
- **Security:** Helmet, CORS, input validation
- **Development:** tsx, nodemon

## Architecture Overview

### Project Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   └── openrouter.ts
│   ├── controllers/
│   │   ├── profileController.ts
│   │   └── storyController.ts
│   ├── models/
│   │   ├── Profile.ts
│   │   ├── Story.ts
│   │   └── Theme.ts
│   ├── routes/
│   │   ├── profileRoutes.ts
│   │   └── storyRoutes.ts
│   ├── services/
│   │   └── storyGenerationService.ts
│   ├── middleware/
│   │   ├── cors.ts
│   │   └── errorHandler.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── promptBuilder.ts
│   ├── app.ts
│   └── server.ts
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seeds/
│       └── themes.sql
├── tests/
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Database Schema (SQLite)

#### profiles table
```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  favorite_animal TEXT NOT NULL,
  favorite_color TEXT NOT NULL,
  best_friend TEXT,
  interest TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### stories table
```sql
CREATE TABLE stories (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  theme TEXT NOT NULL,
  content TEXT NOT NULL,
  model_used TEXT NOT NULL,
  generation_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
```

#### story_themes table
```sql
CREATE TABLE story_themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  gradient TEXT NOT NULL
);
```

### API Endpoints

#### Profile Management
- `POST /api/profiles` - Create/update profile
- `GET /api/profiles/:id` - Get profile

#### Story Generation
- `POST /api/stories/generate` - Generate new story
- `GET /api/stories/:profileId` - Get stories for profile
- `GET /api/themes` - Get available story themes

#### System
- `GET /health` - Health check endpoint

## Story Generation Logic

### Prompt Engineering
Base prompt template for children's stories:

```
You are a talented children's story writer. Create an engaging, age-appropriate story for a {age}-year-old child named {name}.

Child's preferences:
- Favorite animal: {favoriteAnimal}
- Favorite color: {favoriteColor}
- Best friend: {bestFriend}
- Current interest: {interest}

Theme: {themeDescription}

Story Requirements:
- Length: 400-600 words
- Age-appropriate language and content
- Positive, uplifting message
- Include the child's name and preferences naturally in the story
- Engaging narrative with beginning, middle, and end
- Magical or adventurous elements suitable for children
- End with a positive, comforting conclusion

Write a complete, original story:
```

### Safety & Quality Measures
- **Content Filtering:** Age-appropriate language validation
- **Length Limits:** 400-600 words per story
- **Input Validation:** Zod schema validation for all inputs
- **Rate Limiting:** Prevent API abuse
- **Error Handling:** Graceful fallback to hardcoded stories

### Model Fallback Strategy
1. **Primary:** ArliAI QwQ 32B RpR v1 (free)
2. **Secondary:** TheDrummer/Rocinante-12B (ultra-cheap)
3. **Tertiary:** Mistral Nemo 12B Celeste (backup)

## Frontend Integration Strategy

### Smart Fallback System
The frontend will attempt backend API calls first, with seamless fallback:

```typescript
const generateStoryFromBackend = async (profile: Profile, theme: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/stories/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, theme })
    });

    if (!response.ok) throw new Error('Backend unavailable');

    const data = await response.json();
    return data.story;
  } catch (error) {
    console.warn('Backend unavailable, using fallback:', error);
    return null; // Signal to use fallback
  }
};
```

### User Experience
- **Loading States:** Different messages for backend vs fallback
- **Caching:** Store successful backend stories locally
- **Offline Mode:** Detect network issues and use fallback
- **Error Recovery:** Retry failed API calls automatically

### Environment Configuration
```env
BACKEND_URL=http://localhost:3001
NODE_ENV=development
OPENROUTER_API_KEY=your_api_key_here
DATABASE_URL=./database.sqlite
PORT=3001
```

## Dependencies

### Production Dependencies
```json
{
  "express": "^4.18.0",
  "sqlite3": "^5.1.0",
  "openai": "^4.0.0",
  "zod": "^3.22.0",
  "cors": "^2.8.0",
  "helmet": "^7.0.0",
  "morgan": "^1.10.0",
  "dotenv": "^16.0.0"
}
```

### Development Dependencies
```json
{
  "@types/node": "^20.0.0",
  "@types/express": "^4.17.0",
  "@types/cors": "^2.8.0",
  "tsx": "^4.0.0",
  "nodemon": "^3.0.0",
  "typescript": "^5.0.0"
}
```

## Implementation Timeline

### Phase 1: Backend Foundation (Week 1)
- [ ] Set up TypeScript Express server with proper structure
- [ ] Configure SQLite database with migrations and models
- [ ] Implement environment configuration
- [ ] Create health check endpoint
- [ ] Set up basic error handling and logging

### Phase 2: Core API Development (Weeks 1-2)
- [ ] Implement profile CRUD operations with validation
- [ ] Create story theme management system
- [ ] Set up OpenRouter API integration
- [ ] Build story generation service with prompts
- [ ] Implement comprehensive error handling

### Phase 3: Story Generation Logic (Week 2)
- [ ] Craft and optimize prompts for children's stories
- [ ] Implement model fallback strategy
- [ ] Add content safety measures and filtering
- [ ] Test story quality and appropriateness
- [ ] Performance optimization and caching

### Phase 4: Frontend Integration (Weeks 2-3)
- [ ] Modify StoryDisplay component for backend API calls
- [ ] Implement graceful fallback to hardcoded stories
- [ ] Add enhanced loading states and error handling
- [ ] Test integration thoroughly across all themes
- [ ] Update user messaging for better UX

### Phase 5: Testing & Polish (Week 3)
- [ ] Write unit tests for backend services
- [ ] Create integration tests for API endpoints
- [ ] Perform end-to-end testing of story generation
- [ ] Security audit and vulnerability assessment
- [ ] Performance testing and optimization

### Phase 6: Deployment & Monitoring (Weeks 3-4)
- [ ] Set up production deployment with PM2
- [ ] Configure monitoring and logging (Winston)
- [ ] Implement cost tracking and usage alerts
- [ ] Set up database backups and maintenance
- [ ] Create deployment and rollback procedures

## Cost Analysis

### Per Story Costs
- **Primary Model (ArliAI):** $0.00 (free)
- **Secondary Model (TheDrummer):** ~$0.0000007 per story
- **Tertiary Model (Mistral):** ~$0.000002 per story

### Monthly Projections
- **Low Usage (100 stories/month):** <$1
- **Medium Usage (1,000 stories/month):** <$10
- **High Usage (10,000 stories/month):** <$50

### Cost Optimization
- Free primary model handles 95%+ of requests
- Automatic fallback to cheaper models
- Usage monitoring and alerting
- Caching reduces duplicate API calls

## Success Metrics

### Performance Targets
- **Story Generation Success Rate:** >95%
- **Average Response Time:** <10 seconds
- **API Uptime:** >99.5%
- **Fallback Activation:** <5% of requests

### Quality Metrics
- **Story Appropriateness:** 100% age-appropriate content
- **Personalization Accuracy:** All user preferences included
- **User Satisfaction:** Positive feedback on story quality

### Cost Metrics
- **Cost Per Story:** <$0.01 average
- **Monthly Budget Variance:** <10% from projections

## Risk Mitigation

### Technical Risks
- **OpenRouter API Downtime:** Multiple fallback models ensure continuity
- **Content Quality Issues:** Human review process for flagged content
- **Performance Degradation:** Caching, optimization, and monitoring
- **Database Issues:** Regular backups and migration testing

### Operational Risks
- **Cost Spikes:** Usage monitoring with automatic alerts
- **Security Vulnerabilities:** Input validation, CORS, and security headers
- **Scalability Issues:** SQLite limitations monitored, migration plan ready

### Business Risks
- **User Experience Impact:** Seamless fallback ensures app always works
- **Content Appropriateness:** Built-in safety measures and filtering
- **Technical Debt:** Clean architecture and comprehensive testing

## Deployment Strategy

### Environment Setup
- **Development:** Local SQLite database, localhost server
- **Staging:** Separate database, staging API endpoints
- **Production:** Optimized SQLite, production monitoring

### Infrastructure Requirements
- **Server:** Node.js 18+ compatible hosting
- **Database:** SQLite (file-based, no external DB required)
- **Storage:** Local file system for database and logs
- **Backup:** Automated daily database backups

### Monitoring & Alerting
- **Application Metrics:** Response times, error rates, API usage
- **System Metrics:** CPU, memory, disk usage
- **Cost Metrics:** API usage by model, total costs
- **Business Metrics:** Story generation success, user engagement

## Conclusion

This backend implementation provides a cost-effective, reliable, and scalable solution for AI-powered story generation. The architecture prioritizes:

1. **Cost Efficiency:** Free primary model with cheap fallbacks
2. **Reliability:** Multiple fallback layers ensure service continuity
3. **User Experience:** Seamless integration with existing frontend
4. **Safety:** Age-appropriate content with comprehensive filtering
5. **Maintainability:** Clean TypeScript architecture with comprehensive testing

The plan ensures that the Dreamweaver app can provide personalized, AI-generated stories while maintaining the magical experience users expect, with robust fallback mechanisms to guarantee the app always works.
