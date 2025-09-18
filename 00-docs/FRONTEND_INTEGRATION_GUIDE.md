# Frontend Integration Guide

This guide explains how to integrate the React frontend with the new StoryMagic backend API.

## Backend Status

✅ **Backend is fully implemented and running on `http://localhost:3001`**

### Key Features Implemented
- **AI Story Generation**: OpenRouter integration with ArliAI QwQ 32B RpR v1
- **Content Safety**: Multi-layer validation for age-appropriate content
- **Interactive Stories**: Choice points and branching narratives
- **Sleep-Optimized Structure**: 3-phase story format
- **COPPA Compliance**: Local-first architecture
- **Docker Ready**: Zeabur deployment configuration

## API Endpoints

### Health Check
```javascript
GET /health
// Returns server status and health metrics
```

### Story Generation
```javascript
POST /api/stories/generate
Content-Type: application/json

{
  "profile": {
    "name": "Emma",
    "age": 6,
    "favoriteAnimal": "unicorn",
    "favoriteColor": "purple",
    "bestFriend": "Bella",
    "currentInterest": "princesses"
  },
  "count": 3
}
```

### Story Content
```javascript
POST /api/stories/{storyId}/content
Content-Type: application/json

{
  "profile": { /* same as above */ },
  "choices": { /* optional previous choices */ }
}
```

### Content Safety
```javascript
POST /api/content/validate
Content-Type: application/json

{
  "content": "Story content to validate",
  "profile": { /* child profile */ }
}
```

## Integration Example

```javascript
// API client utility
const API_BASE = 'http://localhost:3001/api';

export const storyAPI = {
  async generateStories(profile, count = 3) {
    const response = await fetch(`${API_BASE}/stories/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, count })
    });

    if (!response.ok) {
      throw new Error('Failed to generate stories');
    }

    return response.json();
  },

  async getStoryContent(storyId, profile, choices = {}) {
    const response = await fetch(`${API_BASE}/stories/${storyId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, choices })
    });

    if (!response.ok) {
      throw new Error('Failed to get story content');
    }

    return response.json();
  },

  async validateContent(content, profile) {
    const response = await fetch(`${API_BASE}/content/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, profile })
    });

    return response.json();
  }
};
```

## React Integration

```javascript
// In your React component
import { storyAPI } from './api/client';

function StoryGenerator({ profile }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateStories = async () => {
    setLoading(true);
    try {
      const response = await storyAPI.generateStories(profile, 3);
      setStories(response.stories);
    } catch (error) {
      console.error('Failed to generate stories:', error);
      // Fallback to local stories
      setStories(getFallbackStories(profile));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={generateStories} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Stories'}
      </button>

      {stories.map(story => (
        <StoryCard key={story.id} story={story} />
      ))}
    </div>
  );
}
```

## Progressive Enhancement Strategy

The backend is designed as **progressive enhancement** - your app should work without it:

```javascript
const generateStoryWithFallback = async (profile) => {
  try {
    // Try backend first (enhanced experience)
    const backendStories = await storyAPI.generateStories(profile);
    if (backendStories?.stories?.length > 0) {
      return backendStories.stories; // 3 AI-generated options
    }
  } catch (error) {
    console.warn('Backend unavailable, using fallback:', error);
  }

  // Fallback to current hardcoded stories (guaranteed to work)
  return getFallbackStories(profile);
};
```

## Environment Configuration

### Development
```javascript
const BACKEND_URL = 'http://localhost:3001';
```

### Production
```javascript
const BACKEND_URL = 'https://your-zeabur-app.zeabur.app';
```

## Error Handling

The backend provides structured error responses:

```javascript
{
  "error": {
    "name": "APIError",
    "message": "Invalid request data",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "details": { /* validation errors */ }
  },
  "timestamp": "2025-09-18T13:19:04.667Z",
  "path": "/api/stories/generate"
}
```

## Next Steps

1. **Update your React components** to use the new API endpoints
2. **Implement error boundaries** for graceful degradation
3. **Add loading states** for better UX
4. **Test offline functionality** (fallback mode)
5. **Configure production deployment** when ready

## Deployment

### Backend Deployment (Zeabur)
1. Connect your GitHub repository to Zeabur
2. Set `OPENROUTER_API_KEY` in Zeabur environment variables
3. Deploy automatically with Docker

### Frontend Deployment (Vercel)
1. Update API calls to use production backend URL
2. Deploy to Vercel as usual
3. Backend enhances the experience without breaking offline functionality

The backend is **production-ready** and follows all PRD requirements!
