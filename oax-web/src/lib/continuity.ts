// Continuity Loop Orchestrator (Golden Goose)
//
// The adaptive behavior chain: recent transcripts → theme extraction →
// follow-up inference → autonomous artifact creation. Runs on a cron
// schedule (CONTINUITY_CRON) and produces tasks, sticky notes, and
// workspace files based on the user's evolving interests.
//
// If the user ignores a theme, its strength decays and the system lets
// that thread fade — no nagging.

import {
  extractThemes,
  inferFollowUps,
  readThemes,
  writeThemes,
  mergeThemes,
  Theme,
  FollowUp,
} from './inference';
import { appendTask } from './tasks';
import { saveSticky, saveWorkspaceFile } from './workspace';
import { logInfo } from './logger';

// ---------------------------------------------------------------------------
// Theme fade check
// ---------------------------------------------------------------------------

const FADE_DAYS = 7;

export function shouldFadeTheme(theme: Theme): boolean {
  const lastEngaged = new Date(theme.lastEngaged).getTime();
  const daysSince = (Date.now() - lastEngaged) / (1000 * 60 * 60 * 24);
  return daysSince >= FADE_DAYS || theme.strength < 0.1;
}

// ---------------------------------------------------------------------------
// Continuity loop result
// ---------------------------------------------------------------------------

export interface ContinuityResult {
  themesExtracted: string[];
  followUpsExecuted: FollowUp[];
  themesFaded: string[];
  activeThemes: Theme[];
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

export async function runContinuityLoop(
  generateFn?: (prompt: string) => Promise<string>
): Promise<ContinuityResult> {
  // 1. Extract themes from recent transcripts
  const newTags = await extractThemes(generateFn);
  logInfo('continuity_themes_extracted', { tags: newTags });

  // 2. Merge with persisted themes (boost/decay)
  const existing = readThemes();
  const merged = mergeThemes(existing, newTags);

  // 3. Fade stale themes
  const faded = merged.themes.filter(shouldFadeTheme).map((t) => t.tag);
  merged.themes = merged.themes.filter((t) => !shouldFadeTheme(t));

  // 4. Persist updated themes
  writeThemes(merged);
  logInfo('continuity_themes_persisted', {
    active: merged.themes.length,
    faded: faded.length,
  });

  // 5. Infer follow-ups from active themes
  const followUps = await inferFollowUps(merged.themes, generateFn);
  logInfo('continuity_followups_inferred', { count: followUps.length });

  // 6. Execute all follow-ups (high autonomy)
  const executed: FollowUp[] = [];
  for (const fu of followUps) {
    try {
      switch (fu.type) {
        case 'task':
          appendTask(fu.content);
          logInfo('continuity_task_created', { theme: fu.theme, content: fu.content });
          break;
        case 'sticky':
          saveSticky(fu.title || fu.theme, fu.content);
          logInfo('continuity_sticky_created', { theme: fu.theme, title: fu.title });
          break;
        case 'workspace_file': {
          const name = fu.title || `${fu.theme.replace(/\s+/g, '-')}-followup.md`;
          saveWorkspaceFile({ name, content: fu.content }, 'generated');
          logInfo('continuity_file_created', { theme: fu.theme, name });
          break;
        }
      }
      executed.push(fu);
    } catch (e: any) {
      logInfo('continuity_followup_failed', {
        type: fu.type,
        theme: fu.theme,
        error: e?.message,
      });
    }
  }

  return {
    themesExtracted: newTags,
    followUpsExecuted: executed,
    themesFaded: faded,
    activeThemes: merged.themes,
  };
}
