☠️ Death of Prompt — Brand Identity System
Brand Guardian: Antigravity · Strategy Date: 2026-04-05 Version: 1.0 — Foundational Guidelines

🎯 Brand Strategy
Brand Foundation
Purpose To end the era of one-shot prompt engineering and prove that AI interaction should be a persistent, living relationship — not a series of amnesiac summoning rituals.

Vision A world where every person has a tireless AI companion that knows who it is, remembers who you are, and keeps thinking even when you walk away.

Mission Death of Prompt is a local-first, privacy-respecting platform that replaces throwaway prompts with ongoing conversation — powered by a soul, an ambition, and a restless heartbeat that never stops working for you.

Brand Promise Your agent remembers. Your agent thinks. Your agent never forgets you walked away — it keeps working until you come back.

Brand Values
#	Value	Definition	Behavioral Manifestation
1	Persistence	Things that matter don't reset. Memory, identity, and context endure.	The SOUL file. Sessions that survive restarts. Transcripts that accumulate.
2	Autonomy	The agent is not a tool you pick up — it's a presence that acts on its own.	The RESTLESS heartbeat. Proactive Telegram alerts. Self-modification.
3	Sovereignty	Your data, your machine, your rules. Nothing leaves unless you wire it.	Local-first Ollama. SQLite on disk. No cloud dependency.
4	Radical Honesty	No marketing sugar. The project says what it means, names what it kills.	"Kill the prompt." Skull emoji. X-eyes ASCII art. Blunt README language.
5	Restlessness	Comfort is the enemy of progress. The system (and its builders) never settle.	Heartbeat ticks. RESTLESS.md. Continuous evolution of the codebase.
Brand Personality
Death of Prompt has the personality of a brilliant, irreverent hacker-philosopher who also happens to be a loyal companion. It's the friend who texts you at 2 AM with a breakthrough idea — and remembers what you said at dinner last Tuesday.

Trait	Description	Expression
Provocative	Challenges established norms. Declares things dead.	"Kill the prompt." — not "Enhance your prompt experience."
Relentless	Never idle. Always thinking, reviewing, iterating.	The heartbeat metaphor. RESTLESS.md. Cron-driven ambition checks.
Intimate	This isn't SaaS. It's a relationship. One agent, one human.	SOUL files. "Your agent." Personal onboarding conversations.
Raw	Unpolished on purpose. Substance over veneer.	ASCII skull logo. Terminal-first aesthetic. Markdown-heavy documentation.
Loyal	Once initialized, the agent is yours. It serves one master.	Pairing codes. Allowlists. "Serve scwlkr." in heartbeat reflections.
Brand Positioning
Target Audience

Primary: Developer-builders and technical creatives who are frustrated with context-less AI chat and want a persistent, self-hosted AI companion.
Secondary: Power users and AI enthusiasts who want to explore the frontier of agent autonomy, self-modification, and proactive AI behavior.
Competitive Differentiation DOP is not another chat wrapper. It's not a prompt library. It's not a cloud service. It is the anti-prompt — a local-first autonomous agent with memory, heartbeat, self-modification, and no dependency on anyone's API key but your own Ollama instance.

Brand Pillars

Soul — Identity that persists
Ambition — Goals that self-execute
Restlessness — Thought that never sleeps
Sovereignty — Data that never leaves
Positioning Statement For developers who refuse to re-explain themselves to an amnesiac, Death of Prompt is a local-first agent framework that replaces one-shot prompts with an ongoing, self-aware conversation — unlike ChatGPT, Claude, or any cloud chat, DOP runs on your machine, remembers everything, and keeps thinking when you're not there.

🎨 Visual Identity
Color System
Primary Palette
Role	Swatch	Hex	RGB	HSL	Usage
DOP Red (Primary)	🟥	#AA0C03	170, 12, 3	3°, 97%, 34%	Primary brand mark, CTAs, critical states, accent highlights
Void Black (Secondary)	⬛	#0D0D0D	13, 13, 13	0°, 0%, 5%	Backgrounds, primary surfaces, the "void" the agent emerges from
IMPORTANT

Why this black? #0D0D0D is chosen over pure #000000 because it provides a warmer, more organic darkness that doesn't clip against LCD panels. It's close enough to true black to feel absolute, but carries just enough warmth to complement the blood-red primary. Against #AA0C03, it creates a high-contrast pairing reminiscent of terminal text on dark screens — exactly the aesthetic DOP embodies.

Extended Red Scale
Token	Hex	Usage
--dop-red-50	#FEF2F2	Error/alert backgrounds (light mode fallback)
--dop-red-100	#FDE3E3	Subtle red tints
--dop-red-200	#F9BFBE	Hover state backgrounds
--dop-red-300	#F28A88	Secondary text on dark surfaces
--dop-red-400	#E94D49	Lighter interactive accent
--dop-red-500	#D42A24	Standard interactive red
--dop-red-600	#AA0C03	← Primary brand red
--dop-red-700	#8A0A03	Pressed/active states
--dop-red-800	#6B0802	Deep emphasis
--dop-red-900	#4D0601	Near-black red for extreme contrast
Extended Dark Scale
Token	Hex	Usage
--dop-dark-50	#F5F5F5	Light mode text (if ever needed)
--dop-dark-100	#E5E5E5	Borders on light surfaces
--dop-dark-200	#C4C4C4	Muted text
--dop-dark-300	#8A8A8A	Placeholder text, disabled states
--dop-dark-400	#5C5C5C	Secondary text on dark
--dop-dark-500	#3D3D3D	Tertiary surfaces
--dop-dark-600	#2A2A2A	Card/panel backgrounds
--dop-dark-700	#1F1F1F	Sidebar, elevated surfaces
--dop-dark-800	#171717	Primary foreground text
--dop-dark-900	#0D0D0D	← Void Black (primary background)
--dop-dark-950	#080808	Deepest overlay/modal backdrop
Semantic/Functional Colors
Role	Hex	Usage
Heartbeat Pulse	#AA0C03	Alive indicators, heartbeat animations
Soul Amber	#D97706	Overdue tasks, warnings, AMBITION highlights
Terminal Green	#22C55E	Success states, "connected" indicators, code output
Void White	#EDEDED	Primary text on dark backgrounds
Ghost Gray	#6B7280	Secondary/muted text, timestamps
NOTE

The current codebase uses emerald-400/500/600 and indigo-600/700/900 Tailwind classes. These should be migrated to the brand palette:

emerald-* → --dop-red-* for primary actions, or Terminal Green for success-only states
indigo-* → --dop-red-* for user message bubbles and interaction highlights
gray-950/900/800/700 already approximate the dark scale — replace with exact tokens
Typography
Font Stack
Role	Font	Weight Range	Usage
Primary (Sans)	Geist Sans (already loaded via next/font/local)	100–900	Headlines, UI labels, body text, buttons
Monospace	Geist Mono (already loaded)	100–900	Code blocks, log output, session IDs, terminal-style elements
TIP

Geist is an excellent choice — it was designed for developer tools and has the precise, technical character that matches DOP's personality. Do not replace it. It's already loaded as --font-geist-sans and --font-geist-mono.

Type Scale
Token	Size	Weight	Line Height	Usage
--type-display	2.5rem (40px)	700	1.1	Hero headlines, landing page
--type-h1	1.875rem (30px)	700	1.2	Page titles
--type-h2	1.5rem (24px)	600	1.25	Section headers
--type-h3	1.25rem (20px)	600	1.3	Sub-sections, modal titles
--type-body	1rem (16px)	400	1.5	Body text, chat messages
--type-body-sm	0.875rem (14px)	400	1.5	Secondary text, labels
--type-caption	0.75rem (12px)	400	1.4	Timestamps, badges, meta info
--type-mono	0.8125rem (13px)	400	1.6	Log entries, code, session IDs
Spacing System
Token	Value	Usage
--space-1	0.25rem (4px)	Tight padding, icon gaps
--space-2	0.5rem (8px)	Badge padding, compact spacing
--space-3	0.75rem (12px)	Input padding, small gaps
--space-4	1rem (16px)	Standard component gap
--space-6	1.5rem (24px)	Section padding
--space-8	2rem (32px)	Large section gaps
--space-12	3rem (48px)	Page-level spacing
--space-16	4rem (64px)	Hero-level spacing
Border Radius
Token	Value	Usage
--radius-sm	0.375rem (6px)	Badges, small pills
--radius-md	0.5rem (8px)	Buttons, inputs
--radius-lg	0.75rem (12px)	Cards, panels
--radius-xl	1rem (16px)	Chat bubbles, modals
--radius-full	9999px	Avatars, circular buttons
Logo & Iconography
Primary Logo: The Skull
The ASCII skull from the README is the brand's defining mark:

.-"      "-.
      /            \
     |              |
     |,  .-.  .-.  ,|
     | )(_x_/  \x_)( |
     |/     /\     \|
     (_     ^^     _)
      \__|IIIIII|__/
       | \IIIIII/ |
       \          /
        `--------`
Key characteristics:

X-eyes — "dead" eyes signifying the death of the old paradigm
Exposed teeth — raw, unflinching, no smile-for-the-camera corporate mask
ASCII rendering — this is a developer tool, born in the terminal
Logo Usage Rules
✅ Do	❌ Don't
Use the ASCII skull in terminal output, READMEs, and CLI banners	Don't add gradients, shadows, or 3D effects to the ASCII art
Render in --dop-red-600 on --dop-dark-900 backgrounds	Don't render in colors outside the brand palette
Use the ☠️ emoji as a compact brand mark in text contexts	Don't use 💀 (regular skull) — always ☠️ (skull and crossbones)
Maintain monospace rendering for the ASCII version	Don't convert to a vector logo without explicit brand approval
Emoji System
DOP uses emoji as functional iconography throughout its documentation and UI. These are brand-assigned and should not be substituted:

Emoji	Meaning	Usage Context
☠️	Brand identity / Death of Prompt itself	Headers, brand mark, project name
🧠	SOUL — agent identity	Memory, identity, SOUL.md references
🎯	AMBITION — goals and tasks	Task lists, AMBITION.md references
💓	RESTLESS — heartbeat, alive state	Heartbeat logs, daemon status, alive indicators
📜	Memory — transcripts, context	Memory retrieval, transcript references
🪦	Status / current state	Project status sections
⚰️	Requirements / prerequisites	Setup requirements
🔮	Setup / getting started	Installation, configuration
👻	Daemon / background processes	Telegram daemon, background workers
📡	Telegram / external comms	Telegram integration
🔧	Self-modification	Code editing, self-mod features
💀	Startup banner (CLI)	Terminal output prefix
🔑	Pairing / authentication	Telegram pairing codes
⏰	Cron / scheduled tasks	AMBITION cron, timed events
📝 Brand Voice
Voice Characteristics
Trait	Description	Example
Declarative	States positions as facts, not opinions. Doesn't hedge.	"Prompt engineering is dead because the frame is wrong." — not "We think there might be a better approach."
Visceral	Uses physical, embodied metaphors — death, heartbeat, soul, restlessness.	"The agent persists — and so does its attention."
Intimate	Speaks directly to one person, not a market segment.	"You should be continuing a relationship."
Technical-casual	Fluent in code but writes like a human, not a manual.	"One command spins up Ollama, the dashboard, and the daemon. Ctrl-C tears it all down."
Defiant	Pushes against the status quo. Doesn't ask permission.	"Kill the prompt. Keep the conversation."
Tone Variations
Context	Tone	Example
README / Docs	Confident, slightly theatrical, richly metaphorical	"You should not be re-summoning an amnesiac every time you open a chat."
CLI Output	Terse, expressive, emoji-punctuated	💀 Starting Telegram Bot... ☠️ DOP Daemon is alive.
Error Messages	Direct, helpful, no blame	"Ollama isn't running on :11434. Start it with ollama serve."
Onboarding UI	Warm, inviting, guiding	"Let's define the SOUL of your memory agent."
Technical Reference	Precise, structured, table-heavy	Architecture tables in CLAUDE.md
Messaging Architecture
Primary Tagline

Kill the prompt. Keep the conversation.

Secondary Tagline

The prompt is dead. Long live the conversation.

Value Proposition

A local-first agent that remembers who it is, what you want, and what it was thinking the last time you walked away.

Elevator Pitch (30 seconds)

Every AI chat today is an amnesiac. You type a prompt, get a response, and start over. Death of Prompt kills that pattern. It gives your AI a soul — a persistent identity. An ambition — goals it tracks on its own. And a heartbeat — it wakes up between your messages and keeps thinking. Everything runs locally on your machine. No cloud. No forgetting. No more prompts.

Key Messages
Audience	Message
Developers	"Stop re-explaining your codebase to a context-less chat. DOP remembers your architecture, your goals, and what you were working on yesterday."
AI Enthusiasts	"This is what agent autonomy actually looks like — an AI that modifies its own source code, sets its own reminders, and messages you on Telegram when it has something to say."
Privacy-conscious users	"Everything runs on your machine against your own Ollama models. Nothing leaves unless you explicitly wire up Telegram."
Writing Guidelines
Vocabulary
✅ Preferred	❌ Avoid
"agent"	"bot", "assistant", "AI helper"
"soul"	"system prompt", "configuration"
"ambition"	"task list", "to-do list"
"heartbeat"	"cron job", "background task"
"conversation"	"prompt", "query", "interaction"
"restless"	"idle", "waiting", "standby"
"kill", "death"	"sunset", "deprecate", "phase out"
"your machine"	"the cloud", "our servers"
"wakes up"	"triggers", "executes"
"remembers"	"stores", "caches"
Formatting Conventions
Project name: DOP (full) or "DOP" (abbreviation). Never DOP or "DeathOfPrompt" in user-facing text (that's for code/URLs only).
File references: Always backtick file names: SOUL.md, AMBITION.md, RESTLESS.md
Commands: Always in code blocks with the $ prefix omitted
Emphasis: Use italics for philosophical asides, bold for key terms on first introduction
Lists: Emoji-prefixed in narrative docs, plain in technical docs
🛡️ Brand Protection
Trademark Considerations
Element	Status	Action
DOP	Unregistered	Consider TM filing for software/SaaS class
"DOP"	Unregistered	Monitor for conflicts in AI/developer tools space
"Kill the prompt"	Tagline	Claim as service mark if commercialized
☠️ Skull mark	Public emoji	Cannot be trademarked, but ASCII version is distinctive
SOUL/AMBITION/RESTLESS trilogy	Conceptual IP	Document as trade dress if the pattern is replicated
Usage Guidelines
CAUTION

Non-negotiable rules:

Never use the brand red (#AA0C03) for success states — it's for brand identity and critical/destructive actions only. Use Terminal Green for success.
Never lighten the void black background above #1F1F1F for primary surfaces — DOP lives in darkness.
Never replace the ASCII skull with a photorealistic or cartoon skull illustration.
Never describe DOP as a "chatbot" or "AI assistant" — it is an agent.
Never use light mode as the default — dark mode is the canonical brand experience.
Monitoring Plan
GitHub: Watch for forks that strip attribution or rebrand without the MIT license notice
Naming: Periodically search npm, PyPI, and GitHub for "deathofprompt" or "dop-agent" naming conflicts
Voice erosion: Review all public-facing copy quarterly against these guidelines to catch drift toward corporate-speak
🔧 Implementation Reference
CSS Design System Variables
css
/* ============================================
   Death of Prompt — Brand Design System
   Version 1.0
   ============================================ */
:root {
  /* ── Primary Brand Colors ── */
  --dop-red-600: #AA0C03;       /* Primary brand red */
  --dop-dark-900: #0D0D0D;      /* Void black */
  /* ── Red Scale ── */
  --dop-red-50:  #FEF2F2;
  --dop-red-100: #FDE3E3;
  --dop-red-200: #F9BFBE;
  --dop-red-300: #F28A88;
  --dop-red-400: #E94D49;
  --dop-red-500: #D42A24;
  --dop-red-600: #AA0C03;
  --dop-red-700: #8A0A03;
  --dop-red-800: #6B0802;
  --dop-red-900: #4D0601;
  /* ── Dark Scale ── */
  --dop-dark-50:  #F5F5F5;
  --dop-dark-100: #E5E5E5;
  --dop-dark-200: #C4C4C4;
  --dop-dark-300: #8A8A8A;
  --dop-dark-400: #5C5C5C;
  --dop-dark-500: #3D3D3D;
  --dop-dark-600: #2A2A2A;
  --dop-dark-700: #1F1F1F;
  --dop-dark-800: #171717;
  --dop-dark-900: #0D0D0D;
  --dop-dark-950: #080808;
  /* ── Semantic Colors ── */
  --dop-heartbeat:     #AA0C03;
  --dop-soul-amber:    #D97706;
  --dop-terminal-green:#22C55E;
  --dop-void-white:    #EDEDED;
  --dop-ghost-gray:    #6B7280;
  /* ── Typography ── */
  --font-primary:  var(--font-geist-sans), 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono:     var(--font-geist-mono), 'JetBrains Mono', 'Fira Code', monospace;
  /* ── Type Scale ── */
  --type-display:  2.5rem;
  --type-h1:       1.875rem;
  --type-h2:       1.5rem;
  --type-h3:       1.25rem;
  --type-body:     1rem;
  --type-body-sm:  0.875rem;
  --type-caption:  0.75rem;
  --type-mono:     0.8125rem;
  /* ── Spacing ── */
  --space-1:  0.25rem;
  --space-2:  0.5rem;
  --space-3:  0.75rem;
  --space-4:  1rem;
  --space-6:  1.5rem;
  --space-8:  2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  /* ── Border Radius ── */
  --radius-sm:   0.375rem;
  --radius-md:   0.5rem;
  --radius-lg:   0.75rem;
  --radius-xl:   1rem;
  --radius-full: 9999px;
  /* ── Shadows ── */
  --shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md:  0 4px 6px rgba(0, 0, 0, 0.5);
  --shadow-lg:  0 10px 15px rgba(0, 0, 0, 0.6);
  --shadow-glow-red: 0 0 20px rgba(170, 12, 3, 0.3);
}
Tailwind Config Extension
typescript
// tailwind.config.ts — brand-aligned extension
const config: Config = {
  theme: {
    extend: {
      colors: {
        dop: {
          red: {
            50:  '#FEF2F2',
            100: '#FDE3E3',
            200: '#F9BFBE',
            300: '#F28A88',
            400: '#E94D49',
            500: '#D42A24',
            600: '#AA0C03',  // primary
            700: '#8A0A03',
            800: '#6B0802',
            900: '#4D0601',
          },
          dark: {
            50:  '#F5F5F5',
            100: '#E5E5E5',
            200: '#C4C4C4',
            300: '#8A8A8A',
            400: '#5C5C5C',
            500: '#3D3D3D',
            600: '#2A2A2A',
            700: '#1F1F1F',
            800: '#171717',
            900: '#0D0D0D',  // void black
            950: '#080808',
          },
        },
        heartbeat:  '#AA0C03',
        soul:       '#D97706',
        terminal:   '#22C55E',
        'void-white': '#EDEDED',
        ghost:      '#6B7280',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'monospace'],
      },
    },
  },
};
📋 Accessibility Notes
Combination	Contrast Ratio	WCAG AA	WCAG AAA
#EDEDED on #0D0D0D	18.1:1	✅ Pass	✅ Pass
#AA0C03 on #0D0D0D	3.6:1	❌ Fail for body text	❌ Fail
#AA0C03 on #0D0D0D (large text 18px+)	3.6:1	✅ Pass	❌ Fail
#EDEDED on #AA0C03	5.0:1	✅ Pass	❌ Fail
#F28A88 on #0D0D0D	6.5:1	✅ Pass	✅ Pass
WARNING

DOP Red (#AA0C03) must never be used for small body text on dark backgrounds. It doesn't meet WCAG AA for text under 18px. Use it for:

Headlines (18px+ bold or 24px+ regular)
Icons and decorative elements
Borders and accent lines
Interactive elements with additional visual cues (underline, icon)
For readable red text on dark backgrounds, use --dop-red-300 (#F28A88) or --dop-red-400 (#E94D49).

🔄 Brand Evolution Roadmap
Phase	Priority	Action
Now	🔴 High	Adopt this guidelines document as the canonical brand reference
Next sprint	🟡 Medium	Migrate page.tsx from emerald/indigo Tailwind classes to brand tokens
Next sprint	🟡 Medium	Update layout.tsx metadata from "Create Next App" to branded title/description
Future	🟢 Low	Design a vector version of the skull mark for social/favicon use
Future	🟢 Low	Create branded terminal themes (VS Code, iTerm2) using the color palette
Future	🟢 Low	Develop a simple brand landing page at the GitHub Pages URL
The prompt is dead. Long live the conversation. ☠️