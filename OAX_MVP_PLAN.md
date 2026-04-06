# OAX MVP(Minimum Viable Product) Plan

## Purpose

This is a plan to create a minimum viable product for OpenAlfredo. The goal is to create a working prototype that can be used to test the core concepts of the project.

## Core Concepts

1. OAX's purpose is to make it so that we don't prompt anymore.
2. Prompts need to progress from hopeful wishing on a crystal ball to conversations.
3. OAX is accessed through a telegram bot, and a local web interface.
4. The MVP will use ollama models, and will be run locally.

## MVP Features

1. A conversation with an agent that you create to start the system. When you first start the system, you will be greeted by a agent creation onboarding conversation. This will be saved as a SOUL.md file.
2. A telegram bot that can be used to interact with OAX.
3. A local web interface that can be used to interact with OAX.
4. The ability to switch between different ollama models.
5. A 3-layer memory system that keeps context lightweight and organized.
6. A small index file that is always loaded and points to relevant memory.
7. Topic files that store actual knowledge and are only loaded when needed.
8. Searchable transcripts that preserve full history without loading it into active context.
9. On-demand memory retrieval so the system only pulls in what is relevant to the current task.
10. A scalable memory structure that can grow over time without bloating the main context window.
11. built on a system that has access to logs, error codes, and a TDD framework.
12. A simple CRON system set to run every 30 minutes and check for task that could be done. The name of the system is AMBITION.md. It will start out blank with simple instructions at the top showing the user how to add tasks to it. 
13. A User should be able to message the agent they create, and have the agent add a reoccuring task to the AMBITION.md file. 
14. A User should be able to message the agent and say "I have a date next week. Set a reminder for one day before to remind me to set a reservation at a restaurant."
15. A User should be able to say "I just had a business idea for a dolphin training facility. Write a business plan for it." and it should write a business plan for it. save it as a file in a workspace, and eventually say it as a note in apple notes. 
