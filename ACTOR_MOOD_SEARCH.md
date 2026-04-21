# No Limit Flix® — Actor-Based Mood Similarity Search & Engine

> **Scope:** Definition of a first-class actor-based recommendation system that leverages experiential profiling (Internal DB) and AI-assisted alignment (Mood) rather than generic TMDB lists.

---

## 1. Core Concept

This feature moves beyond simple metadata filtering. It answers: *"I like THIS ACTOR — what should I watch that feels right right now?"* 

It utilizes an **Experiential Profile** for each actor, mapping their performance patterns (pacing, tone, permanence) to match the user's current emotional request.

---

## 2. System Architecture

```text
┌──────────────────────────┐      ┌───────────────────────────┐
│     Search UI / Detail   │      │   User Mood Refinement    │
│    (Actor Chips/Global)  │      │   (Sliders & Tags UI)     │
└────────────┬─────────────┘      └─────────────┬─────────────┘
             │                                  │
             └──────────────────┬───────────────┘
                                │
                  ┌─────────────▼─────────────┐
                  │   /api/ai/actor (POST)    │
                  │   Next.js Route Handler   │
                  └─────────────┬─────────────┘
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
┌───────▼───────┐       ┌───────▼───────┐        ┌───────▼───────┐
│ Actor Service │       │ Mood Service  │        │ Score Engine  │
│ (Similarity)  │       │ (Alignment)   │        │ (Weights)     │
└───────┬───────┘       └───────┬───────┘        └───────┬───────┘
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                                │
                  ┌─────────────▼─────────────┐
                  │    Neon DB (Postgres)     │
                  │   (Actor + Video Tables)  │
                  └───────────────────────────┘
```

---

## 3. Database Design (Prisma)

To support this, `Actor` must be a first-class entity with deep metadata. 

```prisma
model Actor {
  id               String   @id @default(cuid())
  name             String
  tmdbId           String?  @unique
  
  // Experimental Profile
  toneProfile      Json     // ["intense", "grounded", "authoritative"]
  pacingTendency   String   // "slow", "medium", "fast"
  emotionalRange   Float    // 0.0 (Narrow) to 1.0 (Wide)
  genreBlend       Json     // { "drama": 0.8, "thriller": 0.2 }
  
  // Weights for Scoring
  rewatchability   Float    @default(0.5)
  permanenceScore  Float    @default(1.0) // Stability in the library
  
  // Relations
  videos           ActorOnVideo[]

  @@index([name])
}

model ActorOnVideo {
  actorId          String
  videoId          String
  role             String?
  isLead           Boolean  @default(false)
  
  actor            Actor    @relation(fields: [actorId], references: [id])
  video            Video    @relation(fields: [videoId], references: [id])
  
  @@id([actorId, videoId])
}
```

---

## 4. Recommendation Logic (`src/lib/services/ai.ts`)

### 4.1 Similarity Formula
Implementation of the core engineering spec formula:

```typescript
// Weight constants from Spec Section 5
const W_ACTOR_SIMILARITY = 0.45;
const W_MOOD_ALIGNMENT = 0.30;
const W_TITLE_SIMILARITY = 0.15;
const W_PERMANENCE = 0.10;

export async function calculateRecommendationScore(
  actor: Actor,
  title: Video,
  moodTags: string[]
) {
  const actorSim = calculateActorMatch(actor, title); // Tone/Pacing match
  const moodAlign = calculateMoodMatch(title, moodTags); 
  const titleSim = 0.5; // Placeholder for video-to-video similarity
  const permanence = actor.permanenceScore;

  const finalScore = (
    (actorSim * W_ACTOR_SIMILARITY) +
    (moodAlign * W_MOOD_ALIGNMENT) +
    (titleSim * W_TITLE_SIMILARITY) +
    (permanence * W_PERMANENCE)
  );

  return finalScore;
}
```

### 4.2 Explainable AI (XAI)
Every recommendation must justify itself.

```typescript
function generateExplanation(actor: Actor, movie: Video, mood: string[]) {
  return `Chosen because it reflects the ${actor.toneProfile[0]} intensity and ${actor.pacingTendency} pacing you enjoy from ${actor.name}, matching your request for a ${mood.join("/")} experience.`;
}
```

---

## 5. API Specification

**Endpoint**: `POST /api/ai/actor`

**Request Body**:
```json
{
  "actorId": "clx123",
  "moodTags": ["serious", "tense"],
  "constraints": { "includeAdult": false },
  "sessionId": "sess_889"
}
```

**Response Body**:
```json
{
  "hero_title": { "id": "vid_99", "title": "Interstellar", "score": 9.2 },
  "alternates": [...],
  "explanation": "Chosen because it reflects the grounded intensity...",
  "confidence_score": 0.88
}
```

---

## 6. Project Integration Points

This feature is distributed across the following existing and new files:

| Layer | Location | Purpose |
|------|----------|---------|
| **UI** | `src/app/title/[id]/page.tsx` | Add Actor Chips with "Find similar mood" CTA. |
| **UI** | `src/app/ai-pick/page.tsx` | New landing page for the Actor -> Mood flow. |
| **Search** | `src/context/SearchContext.tsx` | Update to support `actor_mood` result types. |
| **API** | `src/app/api/ai/actor/route.ts` | The core recommendation endpoint. |
| **Logic** | `src/lib/services/ai.ts` | The similarity and scoring logic. |

---

## 7. Environment Variables

To run the similarity engine and optional AI explanations, the following keys are required in `.env.local`:

```env
# AI & Explanations (Optional: if using LLM for text generation)
OPENAI_API_KEY="sk-..."

# Actor Profile Source
# Internal or external source for the experiential metadata
ACTOR_METADATA_SECRET="your-shared-secret"

# Feature Flags
ENABLE_MOOD_SIMILARITY=true
```

---

## 8. Testing & Validation

### 8.1 Scoring Unit Tests
Verify the formula constants produce expected results:
- **Test Case**: High Similarity Actor + High Mood Match = High confidence (>0.85).
- **Test Case**: Low Permanence Actor bias reduction.

### 8.2 API Integration Tests
```bash
curl -X POST http://localhost:3000/api/ai/actor \
  -H "Content-Type: application/json" \
  -d '{"actorId": "mock_id", "moodTags": ["intense"]}'
```

### 8.3 Manual UI Validation
1.  Navigate to a **Title Detail** page.
2.  Click an **Actor Chip**.
3.  Verify the **Mood Slider** appears.
4.  Ensure results contain a "Chosen because..." explanation.

---

## 9. Deliverables Checklist

- [ ] **Data Ingestion**: Populate `Actor` table with experiential profiles (not just names).
- [ ] **Mood Taxonomy**: Define the set of `MoodTags` (Intensity, Pacing, Warmth).
- [ ] **Matching Engine**: Implement the weighted similarity algorithm in `src/lib/services/ai.ts`.
- [ ] **Search UI**: Clickable actor chips on detail pages with "Find something like this" CTA.
- [ ] **Personalization Refinement UI**: Sliders for Mood/Pacing (Section 4).

---

*This feature differentiates No Limit Flix by providing experiential discovery that "feels right" for the user's current mood, moving beyond a simple list of movies an actor appeared in.*
