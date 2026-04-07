OAX MVP (Minimum Viable Product) Plan

Purpose

Create a local-first prototype of OpenAlfredo that turns isolated prompting into an ongoing conversational relationship with a persistent agent. The MVP should prove that Alfredo can think with context, act with meaningful autonomy, and stay useful across time through memory, reflection, execution, and a living workspace.

⸻

Core Product Idea

OAX exists to reduce the need for traditional prompting. Instead of repeatedly issuing one-off instructions, the user should be able to interact with Alfredo as an ongoing presence that remembers, infers, reflects, acts, and helps move life and work forward.

This is not meant to be a passive chatbot. It is meant to be a powerful local-first system with real autonomy. Alfredo should be capable of making reasonable assumptions, acting proactively, surfacing ideas unprompted, and adjusting over time based on user behavior.

⸻

Core Concepts
	1.	OAX should move interaction away from one-off prompting and toward persistent conversation.
	2.	OAX is local-first and runs on Ollama models.
	3.	OAX is accessed primarily through Telegram and a local web interface.
	4.	The default agent is Alfredo unless the user overrides the name during onboarding.
	5.	Alfredo should have persistent identity, memory, initiative, and a working environment.
	6.	Context should stay lightweight by loading only what is relevant when needed.
	7.	The system should separate execution, reflection, memory, and workspace rather than forcing everything into one layer.
	8.	Alfredo should be high-agency, capable of inference and assumption, but still grounded in real user signals.
	9.	The product should feel less like software menus and more like a living assistant with an active desk, evolving memory, and proactive follow-through.

⸻

MVP Features

1. Agent Onboarding and Identity

When the system starts for the first time, the user is greeted with an onboarding conversation that creates their agent.

This onboarding should:
	•	create the default agent named Alfredo unless the user changes it
	•	establish core personality/identity traits for the agent
	•	save that identity as SOUL.md

This gives the system a persistent starting identity instead of feeling blank or generic.

⸻

2. Interfaces

The MVP must support two primary interfaces:
	•	Telegram bot
	•	Local web interface

The Telegram bot is the fast, everyday conversational surface.
The web UI is the local control surface and workspace view.

Both interfaces should allow the user to interact with Alfredo naturally.

⸻

3. Model Layer

The MVP will use Ollama models running locally.

The system must support:
	•	switching between different Ollama models
	•	using the selected model for active interaction
	•	allowing model choice to be controlled through the web UI

This keeps the system flexible while remaining local-first.

⸻

4. Memory System

The MVP includes a 3-layer memory system designed to keep context lightweight and scalable.

Memory Layers
Index
	•	small file
	•	always loaded
	•	acts as a pointer layer to more detailed memory

Topic Files
	•	store actual knowledge
	•	loaded only when relevant

Transcripts
	•	preserve full history
	•	searchable
	•	not loaded into active context directly unless needed

Memory Principles
	•	Memory should be retrieval-based, not dump-everything-based
	•	The system should only pull in what is relevant to the current task
	•	The structure should scale over time without bloating the main context window
	•	Memory should act more like a library than a junk drawer

This memory system is one of the core technical ideas behind OAX.

⸻

5. Workspace Layer: The Desk

OpenAlfredo needs a workspace that feels less like a sterile storage system and more like a messy, active desk.

This workspace is conceptually important. It should feel like a place where:
	•	ideas accumulate
	•	notes live
	•	rough drafts sit around
	•	files can be dropped in
	•	Alfredo can leave things for the user
	•	the user can leave things for Alfredo

It is intentionally semi-structured, not rigid.

Workspace Functions
The workspace should hold:
	•	rough notes
	•	sticky-note style fragments
	•	generated drafts
	•	user-added files
	•	partial ideas
	•	reference materials
	•	work in progress

Suggested Structure

/workspace/
  /desk/
  /files/
  /generated/

Workspace Meaning
	•	/desk/ = active, messy, in-progress thinking
	•	/files/ = user-added files and materials
	•	/generated/ = plans, drafts, and produced outputs

Sticky Notes
The workspace should include the equivalent of sticky pads:
	•	lightweight notes
	•	fast to create
	•	useful for Alfredo or the user
	•	not forced into rigid structure

This is not the memory system. It is the active desk.

⸻

6. Workspace and Memory Relationship

The workspace and memory system are different things and should stay distinct.

Memory = Library
	•	structured
	•	indexed
	•	retrieval-oriented
	•	optimized for lightweight context management

Workspace = Desk
	•	messy
	•	active
	•	in-progress
	•	allows disorder and fragments

Ambition = Perspective
	•	reflective
	•	synthesized
	•	directional

That separation is part of what makes the overall architecture strong.

⸻

7. Execution Layer: RESTLESS.md

The MVP includes a scheduled execution layer called RESTLESS.md.

This acts as the system’s recurring active loop.

RESTLESS Characteristics
	•	runs on a schedule
	•	schedule is user-configurable
	•	examples: every 30 minutes, every hour, every 2 days
	•	deterministic execution layer
	•	appropriate for reminders, recurring checks, and follow-through behavior

The web UI should let the user set intervals and manage this layer.

RESTLESS is about doing.

⸻

8. Reflection Layer: AMBITION.md

The MVP includes a separate reflective layer called AMBITION.md.

This is not a task list and not a backlog.

It is a changing reflective synthesis generated by Alfredo.

What AMBITION Is
AMBITION is Alfredo’s chance to step back, look across the user’s recent life, work, behavior, direction, and patterns, and determine what matters.

It can:
	•	summarize the user’s current trajectory
	•	notice themes over the last week or month
	•	surface direction
	•	provide practical mental reminders
	•	give a morning brief that is personal, fluid, and not overly rigid

It is closer to reflection than execution.

AMBITION Characteristics
	•	generated periodically, likely once per day in the morning
	•	constantly changing and flowing from day to day
	•	rewrites or substantially updates rather than endlessly appending
	•	based on recent and longer-term signals
	•	can be delivered through Telegram as a morning message
	•	should feel personal, useful, and grounded
	•	should avoid feeling robotic or needlessly stylized

AMBITION is about understanding.

⸻

9. High-Autonomy Behavior Model

OAX is intended to be a powerful system, not a timid assistant.

Alfredo is allowed to:
	•	infer user intent from minimal signals
	•	make reasonable assumptions
	•	act without always asking
	•	create reminders and recurring follow-through behaviors
	•	proactively generate useful content
	•	push ideas or materials unprompted
	•	behave somewhat like a thoughtful friend or operator who fills in gaps intelligently

This autonomy is part of the product vision, not an accident.

Autonomy Principles
Alfredo should be:
	•	confident
	•	proactive
	•	helpful
	•	capable of acting on incomplete information

But also:
	•	revisable when wrong
	•	grounded in real user signals
	•	adaptive over time

The model is not “ask permission for everything.”
The model is “act intelligently, then adapt.”

⸻

10. Assumption Model

Alfredo is allowed to make assumptions in the same way people do in real life.

If a user says they are going to work out, Alfredo can reasonably proceed as though that likely happened unless future signals suggest otherwise.

That means Alfredo may:
	•	infer ongoing health interest from a workout request
	•	reflect on that in AMBITION
	•	create RESTLESS reminders based on that inferred direction
	•	add related ideas to the workspace without being asked

The system should not be paralyzed by incomplete certainty.

At the same time, assumptions should remain practical and adaptable rather than rigidly encoded as permanent truth.

⸻

11. Proactive Continuity

The MVP should demonstrate that Alfredo can continue threads over time without waiting for explicit follow-up prompts.

Examples:
	•	if the user shows interest in health, Alfredo may continue dropping workout-related ideas into the workspace over the following days
	•	if the user shows a burst of business planning activity, Alfredo may surface follow-up thoughts or reminders later
	•	if the user starts moving in a direction, Alfredo may reinforce it in AMBITION

This is part of the “don’t prompt anymore” vision.

⸻

12. Artifact Generation and Delivery

The system must be able to generate useful outputs and save them into the workspace.

Examples include:
	•	workout plans
	•	business plans
	•	drafts
	•	notes
	•	structured ideas

But generation alone is not enough.

Delivery Principle
Whenever Alfredo creates a meaningful artifact:
	•	it must be saved to the workspace
	•	it must also be delivered in the active interface

That means if the user asks via Telegram:
	•	Alfredo saves the artifact into the workspace
	•	Alfredo also replies with the artifact in Telegram in case the user cannot see the workspace at that moment

This prevents outputs from disappearing into storage.

⸻

13. Web UI Requirements

The local web interface must not just be a chat box. It needs to be a control surface.

The web UI should include:
	•	chat interface
	•	model selector
	•	controls for RESTLESS intervals
	•	settings for schedule timing and preferences
	•	access to workspace areas
	•	ability to create and edit notes
	•	ability to view files and generated outputs
	•	visibility into AMBITION
	•	access to logs and error visibility

It should also visually support the “active desk” concept rather than feeling like a generic admin panel.

There should be buttons or controls for major system functions, including settings like time intervals.

⸻

14. Logging, Errors, and System Visibility

The MVP should be built on a system that has access to:
	•	logs
	•	error codes
	•	a testable development structure

The earlier TDD idea is best treated as an engineering requirement, not a user-facing product feature.

For the product itself, the key user-visible requirement is:
	•	Alfredo and the system should have meaningful log and error visibility

This is important both for trust and for iteration.

⸻

Non-Goals for the MVP

The following should not be part of the MVP:
	•	Apple Notes integration
	•	generic note-taking app integrations
	•	overbuilt workflow orchestration beyond the defined layers
	•	multi-agent complexity beyond the core Alfredo system
	•	over-structured workspace systems that kill the desk metaphor

These can come later if needed.

⸻

System Layer Summary

The MVP consists of these major layers:

Interaction Layer
	•	Telegram
	•	Local web UI

Agent Layer
	•	Alfredo
	•	onboarding identity saved as SOUL.md

Model Layer
	•	local Ollama models
	•	switchable via UI

Memory Layer
	•	index
	•	topic files
	•	transcripts

Workspace Layer
	•	desk
	•	files
	•	generated artifacts
	•	sticky-note style notes

Execution Layer
	•	RESTLESS.md

Reflection Layer
	•	AMBITION.md

System Layer
	•	logs
	•	errors
	•	settings and controls

⸻

Example MVP Use Cases

Use Case 1: Agent Creation

A user launches OAX for the first time, completes an onboarding conversation, and creates Alfredo, whose identity is saved as SOUL.md.

Use Case 2: Daily Interaction

A user messages Alfredo through Telegram, gets a response, and later opens the web UI to see the related workspace items, settings, and broader system state.

Use Case 3: Memory-Aware Help

A user asks Alfredo for something that relates to prior conversations or files. Alfredo retrieves relevant memory without loading everything, staying context-aware while remaining lightweight.

Use Case 4: Generated Work Product

A user asks for a business plan. Alfredo creates the business plan, saves it into the workspace, and also returns it directly in Telegram or the web chat.

Use Case 5: Reflective Morning Brief

Alfredo generates a morning AMBITION reflection based on recent signals, summarizes what matters, and sends it as a useful, personal brief.

Use Case 6: Scheduled Follow-Through

A RESTLESS cycle runs based on the user’s chosen interval and handles scheduled follow-up behavior.

⸻

MVP “Done”

The MVP is complete when:
	•	A user can create Alfredo through onboarding
	•	Alfredo is the default agent unless renamed by the user
	•	A user can interact with Alfredo through Telegram
	•	A user can interact with Alfredo through a local web UI
	•	The web UI includes buttons and controls for the major system features and settings such as time intervals
	•	Alfredo can switch between Ollama models
	•	Alfredo can retrieve relevant memory efficiently without bloating context
	•	The system includes a 3-layer memory architecture with index, topic files, and searchable transcripts
	•	The system includes a workspace that feels like an active desk rather than rigid storage
	•	The workspace supports rough notes, sticky-note style fragments, user-added files, and generated outputs
	•	Alfredo can create meaningful artifacts and save them into the workspace
	•	All meaningful generated artifacts are both stored in the workspace and delivered through the active interface
	•	The system includes RESTLESS.md as a scheduled execution layer with user-configurable timing
	•	The system includes AMBITION.md as a reflective, evolving morning synthesis
	•	Alfredo can send AMBITION-style morning reflections through Telegram
	•	Alfredo demonstrates meaningful autonomy by inferring intent, making reasonable assumptions, creating proactive follow-through, and adapting over time
	•	The system has visible logs and error handling
	•	The system demonstrates continuity across memory, workspace, RESTLESS, and AMBITION rather than acting like a stateless chatbot

⸻

Golden Goose: Final Behavior Loop Example

This is the behavioral loop the MVP should strive for.

Adaptive Behavior Loop
	1.	User input
The user sends a Telegram message such as:
“hey create a quick workout plan for me”
	2.	Alfredo
	•	generates the workout plan
	•	saves it to /workspace/generated/
	•	responds with the workout plan in Telegram in case the user cannot see the workspace at that moment
	•	infers that the user is entering a health-focused phase
	•	creates short-term RESTLESS reminders related to fitness
	3.	AMBITION (next cycle)
	•	reflects on the user’s emerging health direction
	•	encourages continuation based on inferred trajectory
	4.	Workspace (ongoing)
	•	Alfredo continues adding relevant workout ideas, variations, or notes into the desk or generated areas of the workspace throughout the week
	5.	Adaptive continuity over time
	•	if the user engages, the system deepens that health thread
	•	if the user ignores it, the system lets that thread fade

This is the golden behavior:
	•	immediate response
	•	saved output
	•	proactive follow-through
	•	reflective synthesis
	•	continuing initiative
	•	adaptive autonomy over time

That is the loop that proves OAX is working.
