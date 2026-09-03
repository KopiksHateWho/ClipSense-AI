# 🎬 ClipSense AI

<p align="center">
  <strong>Turn long-form videos into AI-discovered highlight clips.</strong>
</p>

<p align="center">
  Analyze. Understand. Score. Clip.
</p>

<p align="center">
  <a href="https://github.com/KopiksHateWho/ClipSense-AI">
    <img src="https://img.shields.io/badge/GitHub-ClipSense--AI-181717?style=for-the-badge&logo=github" alt="GitHub">
  </a>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Convex-Backend-EE342F?style=for-the-badge" alt="Convex">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Framer%20Motion-12-0055FF?style=flat-square" alt="Framer Motion">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License">
</p>

---

## ✨ What is ClipSense AI?

**ClipSense AI** is an AI-powered video intelligence application designed to find the most valuable moments inside long-form video.

Instead of manually scrubbing through an entire podcast, interview, livestream, tutorial, or recording looking for moments worth clipping, ClipSense analyzes the video's audio, generates a timestamped transcript, and uses an LLM to identify and rank potential highlights.

### The idea is simple:

> **Give ClipSense a long video. Let AI figure out where the interesting parts are.**

The result is a collection of ranked clip candidates containing:

* ⏱️ Start and end timestamps
* 📊 AI-generated clip score
* 🏷️ Highlight category
* 💡 Reason why the moment is worth clipping

ClipSense is built around a modular processing pipeline, allowing transcription and AI analysis providers to be changed independently.

---

## 🎯 Why ClipSense?

Finding good short-form content inside long videos is surprisingly tedious.

A 90-minute recording might contain only a handful of genuinely interesting moments. Traditionally, discovering them means watching the entire recording, manually taking notes, remembering timestamps, and then deciding what is actually worth turning into a clip.

ClipSense changes that workflow.

```text
Long-form Video
       │
       ▼
   Audio Input
       │
       ▼
   Transcription
       │
       ▼
 Timestamped Transcript
       │
       ▼
  AI Highlight Analysis
       │
       ▼
 Ranked Clip Candidates
       │
       ▼
 Review & Export
```

The system focuses on **content discovery first**, rather than blindly cutting videos at arbitrary intervals.

---

# 🚀 Core Features

## 🎥 Multiple Video Sources

ClipSense supports two primary input modes:

* Local video uploads
* YouTube URLs

For YouTube sources, ClipSense retrieves the audio required for downstream processing before continuing through the analysis pipeline.

---

## 📝 AI-Powered Transcription

The transcription layer converts spoken content into timestamped segments that can be analyzed by the AI pipeline.

Supported transcription providers currently include:

| Provider       | Model / API                      |
| -------------- | -------------------------------- |
| **Groq**       | Whisper Large V3                 |
| **Deepgram**   | Nova-2                           |
| **OpenAI**     | Whisper                          |
| **AssemblyAI** | Provider configuration available |

The provider architecture keeps transcription independent from the highlight-analysis model, making it easier to experiment with different services.

---

## 🧠 AI Highlight Detection

Once the transcript is available, ClipSense sends the content to an LLM-based analysis layer.

The AI looks for characteristics commonly associated with strong short-form moments, including:

* Strong opinions
* Exclamations
* Laughter
* Dramatic moments
* Interesting insights
* Emotional moments
* Reactions
* Buildup and payoff
* Potentially viral statements

Each candidate receives a **clip potential score from 0.0 to 1.0**.

The system also generates a human-readable explanation describing why the moment was selected.

---

## 🤖 Multiple LLM Providers

ClipSense isn't locked to a single AI provider.

The highlight-analysis layer currently supports:

| Provider      | Model             |
| ------------- | ----------------- |
| **Anthropic** | Claude Sonnet     |
| **OpenAI**    | GPT-4o Mini       |
| **Google**    | Gemini            |
| **SambaNova** | Llama-based model |

This architecture makes the project useful not only as an application, but also as a playground for comparing different LLM providers for content analysis.

---

## 🎚️ Audio-Aware Analysis

ClipSense can optionally provide audio-energy information to the AI alongside the transcript.

This gives the analysis layer additional context about moments where the audio becomes more energetic.

```text
Transcript
    +
Audio Energy
    ↓
AI Highlight Analysis
    ↓
Better Context for Clip Selection
```

The goal isn't simply to find sentences that *sound* interesting on paper, but to provide additional signals about how the moment behaves as actual spoken content.

---

## 📊 Clip Scoring & Classification

Every generated clip candidate contains structured metadata:

```json
{
  "startTime": 42.5,
  "endTime": 78.2,
  "score": 0.91,
  "label": "Insight",
  "reason": "The speaker delivers a concise and highly actionable explanation."
}
```

Possible labels include categories such as:

* `High Energy`
* `Funny`
* `Insight`
* `Dramatic`
* `Emotional`
* `Viral`
* `Reaction`

This makes the generated results much easier to review and organize than a simple list of timestamps.

---

## ✂️ Clip Preview & Export

Every discovered clip can be opened in a preview modal showing its exact time range, score, label, and the AI's reasoning.

From there you can:

* **Export the clip** — the browser trims the source video with FFmpeg (WASM) and downloads a ready-to-publish clip file
* Share or open the original source

Export runs fully client-side: video bytes never leave your browser.

---

## ⚡ Real-Time Processing State

Video processing is represented as a job with explicit processing states.

```text
Pending
   ↓
Processing
   ↓
Transcribing
   ↓
Analyzing
   ↓
Completed
```

If something goes wrong, the job can transition into:

```text
Failed
```

Progress information and error messages are persisted so the frontend can communicate what is happening instead of leaving users staring at a mysterious loading spinner, humanity's favorite UI element.

---

## 🔐 Authentication

ClipSense uses **Convex Auth** for authentication.

The current authentication system supports:

* **GitHub OAuth** — one-click sign-in with your GitHub account
* **Guest login** — instant anonymous access for previewing (see Guest Mode below)
* Protected application routes
* User-specific data
* Authenticated dashboard access

Protected routes use a reusable authentication guard so authenticated application functionality is separated from public pages.

### GitHub OAuth setup

To enable GitHub sign-in, create an OAuth App in your GitHub account settings and configure these environment variables on your Convex deployment:

```env
AUTH_GITHUB_ID=your_client_id
AUTH_GITHUB_SECRET=your_client_secret
SITE_URL=https://your-frontend-url
```

The GitHub OAuth callback URL must point at your Convex site:

```text
https://<your-deployment>.convex.site/api/auth/callback/github
```

`SITE_URL` controls where users land after a successful sign-in — it must be your app's URL, not the Convex backend URL.

### Editable user profiles

Signed-in users can manage their public profile from the **Profile** page:

* Display name
* Username
* Bio
* Location
* Website

Profiles are stored per-user in Convex and used across the application.

---

## 🧑‍💻 Guest Mode (Review Only)

Guests can try ClipSense instantly without an account via **Continue as Guest**.

Guest sessions are read-only previews:

* Browse the workspace and see how the workflow looks
* View the history section and sample UI

The following features require a signed-in GitHub account:

* Running new video analyses (YouTube or upload)
* Configuring transcription / LLM API keys
* Exporting clips

When a guest tries to use a locked feature, they are prompted to sign in with GitHub. Signing in cleanly replaces the anonymous session with a real account. Guest sessions are private and ephemeral — nothing created during a guest session is saved or migrated.

---

## 🔑 Bring Your Own API Keys

ClipSense is designed around a **BYOK (Bring Your Own Key)** model.

Users configure:

### Transcription Provider

```text
Groq
Deepgram
AssemblyAI
OpenAI
```

### LLM Provider

```text
Claude
OpenAI
Gemini
SambaNova
```

The selected provider and credentials are stored as user-specific application settings and used by the processing pipeline.

The Settings page includes a **Quick Setup** panel that links directly to free providers with no credit card required — **Groq** (free Whisper transcription) and **SambaNova** (free Llama 3 LLM inference) — so new users can go from zero to a working pipeline in about two minutes.

This makes provider selection an application-level configuration rather than something hardcoded into the processing engine.

---

# 🏗️ Architecture

ClipSense follows a frontend + serverless backend architecture.

```text
┌─────────────────────────────────────────────────────────┐
│                     ClipSense AI                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  React 19 + TypeScript + Vite                          │
│                    │                                    │
│                    ▼                                    │
│              Convex Client                              │
│                    │                                    │
├────────────────────┼────────────────────────────────────┤
│                    ▼                                    │
│              Convex Backend                              │
│                                                         │
│       ┌──────────────┬──────────────┐                  │
│       │              │              │                  │
│       ▼              ▼              ▼                  │
│     Jobs           Clips       API Settings            │
│       │              │              │                  │
│       └──────────────┴──────────────┘                  │
│                    │                                    │
│                    ▼                                    │
│             Video Processing                            │
│                    │                                    │
│        ┌───────────┴───────────┐                       │
│        ▼                       ▼                       │
│  Transcription             LLM Analysis                │
│        │                       │                       │
│  ┌─────┼─────┐          ┌─────┼────────┐              │
│  ▼     ▼     ▼          ▼     ▼        ▼              │
│ Groq Deepgram OpenAI   Claude OpenAI Gemini            │
│                                      +                 │
│                                  SambaNova              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 🔬 Processing Pipeline

The core processing engine lives in the Convex backend.

### Step 1 — Ingest

ClipSense receives either:

* A local video upload
* A YouTube URL

For YouTube input, the application retrieves the audio stream before transcription.

### Step 2 — Transcription

Audio is sent to the configured transcription provider.

The returned transcript contains timing information:

```text
[00:12] "The first thing you need to understand..."
[00:17] "This completely changes the way..."
[00:24] "And that's where most people make..."
```

### Step 3 — Context Construction

The timestamped transcript is transformed into structured text for the analysis model.

Optional audio-energy information can also be included.

### Step 4 — Highlight Detection

The selected LLM evaluates the transcript and identifies the strongest moments.

The model returns:

```text
Start
End
Score
Label
Reason
```

### Step 5 — Persistence

Generated clips are stored in Convex and associated with the processing job and user.

### Step 6 — Completion

The job is marked as completed and the generated clip candidates become available to the application.

---

# 🗂️ Project Structure

```text
ClipSense-AI/
│
├── public/
│   ├── logo.svg
│   └── manifest.webmanifest
│
├── src/
│   │
│   ├── assets/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── LogoDropdown.tsx
│   │   └── RequireAuth.tsx
│   │
│   ├── convex/
│   │   ├── auth/
│   │   ├── apiSettings.ts
│   │   ├── auth.config.ts
│   │   ├── auth.ts
│   │   ├── clips.ts
│   │   ├── http.ts
│   │   ├── jobs.ts
│   │   ├── processVideo.ts
│   │   ├── schema.ts
│   │   └── users.ts
│   │
│   ├── hooks/
│   │
│   ├── lib/
│   │
│   ├── pages/
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Landing.tsx
│   │   ├── Profile.tsx
│   │   └── Settings.tsx
│   │
│   ├── types/
│   │
│   ├── index.css
│   ├── instrumentation.tsx
│   └── main.tsx
│
├── .env.example
├── components.json
├── convex.json
├── eslint.config.js
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

# 🛠️ Tech Stack

### Frontend

| Technology         | Purpose                     |
| ------------------ | --------------------------- |
| **React 19**       | UI framework                |
| **TypeScript**     | Type safety                 |
| **Vite**           | Development & build tooling |
| **React Router 7** | Application routing         |
| **Tailwind CSS 4** | Styling                     |
| **shadcn/ui**      | UI primitives               |
| **Lucide React**   | Icons                       |
| **Framer Motion**  | Animations                  |
| **Three.js**       | 3D visual experiences       |

### Backend

| Technology          | Purpose                     |
| ------------------- | --------------------------- |
| **Convex**          | Serverless backend          |
| **Convex Auth**     | Authentication              |
| **Convex Database** | Jobs, clips & user settings |
| **Convex Actions**  | External API integrations   |

### AI / Media

| Technology         | Purpose                       |
| ------------------ | ----------------------------- |
| **Groq Whisper**   | Speech transcription          |
| **Deepgram**       | Speech transcription          |
| **OpenAI Whisper** | Speech transcription          |
| **Claude**         | Highlight analysis            |
| **GPT-4o Mini**    | Highlight analysis            |
| **Gemini**         | Highlight analysis            |
| **SambaNova**      | Highlight analysis            |
| **FFmpeg WASM**    | Browser-side media processing |

---

# 💻 Getting Started

## Prerequisites

Make sure you have:

* [Node.js](https://nodejs.org/)
* [Bun](https://bun.sh/)
* A Convex project
* A supported transcription API key
* A supported LLM API key

---

## 1. Clone the repository

```bash
git clone https://github.com/KopiksHateWho/ClipSense-AI.git
cd ClipSense-AI
```

---

## 2. Install dependencies

Using Bun:

```bash
bun install
```

Or, if you prefer npm:

```bash
npm install
```

The repository is configured around Bun as its preferred package manager.

---

## 3. Configure environment variables

Create your local environment file:

```bash
cp .env.example .env.local
```

Configure the required Convex variables:

```env
CONVEX_DEPLOYMENT=your_convex_deployment
VITE_CONVEX_URL=your_convex_url
```

Authentication-related server configuration is handled separately by Convex.

> **Never commit API keys, private keys, or production credentials to Git.**

---

## 4. Start the development server

```bash
bun run dev
```

The Vite development server will start locally.

---

# 🔐 API Provider Configuration

After launching ClipSense, configure your AI providers through the application's settings.

## Transcription

Choose one:

```text
Groq
Deepgram
AssemblyAI
OpenAI
```

Then provide the corresponding API key.

## Highlight Analysis

Choose one:

```text
Claude
OpenAI
Gemini
SambaNova
```

Then provide the corresponding API key.

ClipSense checks that both a transcription key and LLM key are configured before beginning video processing.

---

# 🧪 Development Commands

```bash
# Start development server
bun run dev

# Create production build
bun run build

# Run ESLint
bun run lint

# Format the project
bun run format

# Preview production build
bun run preview
```

---

# 📦 Data Model

ClipSense currently organizes its persistent data around several core entities.

### Users

Stores authenticated user information, GitHub/guest identity flags, and editable profile fields.

```text
name
image
email
isAnonymous
username
bio
location
website
```

### Jobs

Represents a video-processing request.

```text
source
status
progress
duration
clipCount
exportedCount
createdAt
completedAt
```

### Clips

Represents an AI-discovered highlight.

```text
job
startTime
endTime
score
label
reason
exported
createdAt
```

### API Settings

Stores the user's selected AI providers and API credentials.

```text
transcriptionProvider
transcriptionApiKey
llmProvider
llmApiKey
```

This separation allows one user to configure their own AI stack without changing the application's global configuration.

---

# 🧠 How ClipSense Chooses Moments

ClipSense doesn't simply split a video every 30 seconds and call it artificial intelligence.

The highlight-analysis prompt explicitly asks the model to consider signals such as:

* Strong opinions
* Laughter
* Exclamations
* Dramatic pauses
* Buildup and payoff
* Emotional moments
* Reactions
* Self-contained storytelling

The model then produces a ranked set of candidate moments.

Conceptually:

```text
                    Transcript
                        │
                        ▼
              ┌─────────────────┐
              │ Context Analysis │
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Emotion      Insight       Energy
          │            │            │
          └────────────┼────────────┘
                       ▼
                Clip Potential
                       │
                       ▼
                 Ranked Clips
```

---

# 🎨 UI & Design Philosophy

ClipSense is built with a modern application-oriented UI rather than treating the project as a collection of disconnected AI demos.

The frontend uses:

* Responsive layouts
* shadcn/ui primitives
* Tailwind CSS
* Framer Motion animations
* Lucide icons
* Light/dark theme support
* Toast-based feedback
* Protected dashboard routes

The project also follows a deliberate visual rule:

> **Less clutter. More hierarchy.**

Avoiding unnecessary nested cards, excessive shadows, and overloaded layouts keeps the interface focused on the actual workflow.

---

# 🔒 Security Notes

ClipSense is designed with user-scoped data and authenticated backend operations.

Important considerations when deploying your own instance:

* Never commit `.env` files.
* Never expose private API keys through frontend source code.
* Keep Convex authentication configuration protected.
* Apply authorization checks to backend queries, mutations, and actions.
* Do not expose production Convex credentials publicly.
* Treat user-provided API credentials as sensitive information.

### YouTube & Copyright

ClipSense can process YouTube sources, but **you are responsible for ensuring that you have the necessary rights or permissions to process, edit, and redistribute the content you submit**.

The existence of a download button somewhere in the universe does not magically transfer copyright ownership. Humanity has tried this trick before.

---

# 🚧 Current Status

ClipSense AI is an actively developed project.

### Current focus

* AI-assisted highlight discovery
* Multi-provider transcription
* Multi-provider LLM analysis
* Job processing pipeline
* Clip scoring
* GitHub OAuth authentication
* Guest mode (review-only previews)
* Clip preview & export
* Editable user profiles
* Persistent clip history
* Configurable AI providers

### Planned / Possible Future Improvements

* [ ] More advanced clip ranking
* [ ] Better semantic context analysis
* [ ] Speaker-aware analysis
* [ ] More granular word-level timestamps
* [ ] Advanced clip preview
* [ ] Automated video rendering pipeline
* [ ] Caption generation
* [ ] Smart vertical reframing
* [ ] Batch processing
* [ ] Clip editing controls
* [ ] Export presets for Shorts / Reels / TikTok
* [ ] Analytics for generated clips
* [ ] Provider benchmarking
* [ ] Local AI model support

---

# 🗺️ Roadmap

```text
                    ClipSense AI
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   Understand        Discover          Create
        │                │                │
   Transcript       AI Scoring       Clip Render
        │                │                │
   Audio Signals    Ranking System    Captions
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
                 Content Workflow
```

### Phase 1 — Intelligence

* [x] Video ingestion
* [x] YouTube source support
* [x] Audio extraction
* [x] Multi-provider transcription
* [x] Timestamped transcript
* [x] LLM highlight detection
* [x] Clip scoring
* [x] Clip categorization
* [x] AI-generated reasoning

### Phase 2 — Creator Workflow

* [ ] Advanced preview
* [ ] Clip editing
* [ ] Caption generation
* [ ] Smart reframing
* [x] Clip export (browser-side FFmpeg trimming)

### Phase 3 — Content Automation

* [ ] Batch processing
* [ ] Platform presets
* [ ] Publishing integrations
* [ ] Content analytics
* [ ] Automated content workflows

---

# 🤝 Contributing

Contributions are welcome.

### 1. Fork the repository

```bash
git fork
```

### 2. Create a feature branch

```bash
git checkout -b feature/your-feature
```

### 3. Make your changes

Keep the implementation consistent with the existing architecture and TypeScript conventions.

### 4. Verify your changes

```bash
bun run lint
bun run build
```

### 5. Commit

```bash
git commit -m "feat: add your feature"
```

### 6. Push

```bash
git push origin feature/your-feature
```

### 7. Open a Pull Request

Describe:

* What changed
* Why it changed
* How it works
* How it was tested

---

# 📄 License

This project is licensed under the **MIT License**.

---

# 👨‍💻 Author

Built by **KopiksHateWho**

GitHub:

**https://github.com/KopiksHateWho**

Project:

**https://github.com/KopiksHateWho/ClipSense-AI**

---

<p align="center">
  <strong>ClipSense AI</strong>
  <br>
  Turning hours of video into moments worth watching.
</p>

<p align="center">
  Made with React, Convex, TypeScript, and an unreasonable amount of AI.
</p>
