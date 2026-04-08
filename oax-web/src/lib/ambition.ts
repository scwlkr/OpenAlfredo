// AMBITION.md — pure reflection layer.
//
// After the task migration, AMBITION.md holds only the agent's reflective
// synthesis (morning brief, trajectory, themes). Task CRUD now lives in
// tasks.ts / TASKS.md.
//
// This module provides basic read/write for the reflection content. The full
// LLM-driven reflection generator lives in ambition-reflection.ts (Phase 1B).
import fs from 'fs';
import path from 'path';
import { AMBITION_PATH as CANONICAL_AMBITION_PATH } from './paths';

export const AMBITION_PATH = CANONICAL_AMBITION_PATH;

export function readAmbition(): string {
  try {
    return fs.readFileSync(CANONICAL_AMBITION_PATH, 'utf-8');
  } catch {
    return '';
  }
}

export function writeAmbition(content: string): void {
  fs.mkdirSync(path.dirname(CANONICAL_AMBITION_PATH), { recursive: true });
  fs.writeFileSync(CANONICAL_AMBITION_PATH, content);
}
