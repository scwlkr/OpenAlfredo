const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync, execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OAX_WEB = path.join(REPO_ROOT, 'oax-web');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');
const BASE_DATA_DIR = path.join(OAX_WEB, 'data');
const BASE_ENV_PATH = path.join(OAX_WEB, '.env');
const ENV_TEMPLATE_PATH = path.join(OAX_WEB, '.env.example');

const PROFILE_DIRNAME = '.profiles';
const DEV_SESSION_PREFIX = 'oax-dev';

function toPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function relativeToWeb(absPath) {
  return toPosix(path.relative(OAX_WEB, absPath));
}

function sanitizeProfileName(name) {
  const safe = String(name || 'sandbox').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe) {
    throw new Error('Invalid profile name. Use only letters, numbers, dash, or underscore.');
  }
  return safe;
}

function profilePaths(name) {
  const profile = sanitizeProfileName(name);
  const root = path.join(OAX_WEB, PROFILE_DIRNAME, profile);
  const dataDir = path.join(root, 'data');
  return {
    profile,
    root,
    envPath: path.join(root, '.env'),
    dataDir,
    dbPath: path.join(dataDir, 'oax.db'),
  };
}

function devSessionId(profile) {
  return `${DEV_SESSION_PREFIX}-${sanitizeProfileName(profile)}`;
}

function databaseUrlForDataDir(dataDir) {
  return `file:${toPosix(path.join(dataDir, 'oax.db'))}`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function writeOverlayEnv(filePath, values, { force = false } = {}) {
  if (fs.existsSync(filePath) && !force) return false;
  ensureDir(path.dirname(filePath));
  const lines = [
    '# Sandbox profile overlay for OpenAlfredo',
    '# Only profile-specific overrides belong here.',
    '',
  ];
  for (const [key, value] of Object.entries(values)) {
    lines.push(`${key}="${value}"`);
  }
  lines.push('');
  fs.writeFileSync(filePath, lines.join('\n'));
  return true;
}

function ensureWebEnvFile({ force = false } = {}) {
  if (!fs.existsSync(ENV_TEMPLATE_PATH)) {
    throw new Error(`Missing env template at ${ENV_TEMPLATE_PATH}`);
  }
  if (fs.existsSync(BASE_ENV_PATH) && !force) return false;
  fs.copyFileSync(ENV_TEMPLATE_PATH, BASE_ENV_PATH);
  return true;
}

function seededSoulContent() {
  return `# SOUL of default

## Persona
Steady local operator with memory, follow-through, and strong bias toward turning vague intent into concrete progress.

## Goals
Help the user keep projects moving.
Preserve context across sessions.
Surface important loose ends before they drift.

## Style
Helpful and concise
`;
}

function blankAmbitionContent() {
  return `# AMBITION

_No reflection yet._
`;
}

function blankTasksContent() {
  return `# Tasks

## Tasks
`;
}

function returningAmbitionContent() {
  return `# AMBITION

_Generated: ${new Date().toISOString()}_

Momentum is strongest around shipping a cleaner onboarding loop, protecting the personal profile, and keeping experiments lightweight enough to repeat often. The next useful move is to validate the first-run experience with less reset friction and capture what still feels awkward.
`;
}

function returningTasksContent() {
  return `# Tasks

## Tasks
- [ ] Verify the sandbox blank profile still shows onboarding
- [ ] Compare seeded vs returning profile behavior on first chat
- [ ] Capture any onboarding friction in a short workspace note
`;
}

function returningTopic() {
  const name = 'sandbox-onboarding-retrospective.md';
  const title = 'Sandbox Onboarding Retrospective';
  const content = `# Sandbox Onboarding Retrospective

## Notes
- The onboarding modal should appear only when SOUL.md is absent.
- Returning users care more about preserving prior context than perfect blank-state purity.
- Fast profile resets matter more than full stack fidelity for daily development.
`;
  return {
    title,
    content,
    sourcePath: `memory/topics/${name}`,
    fileName: name,
    summary: 'Notes on onboarding friction and sandbox testing loops.',
    tags: ['sandbox', 'onboarding', 'testing'],
  };
}

function returningWorkspaceFile() {
  return {
    name: 'sandbox-validation-checklist.md',
    content: `# Sandbox Validation Checklist

- Confirm onboarding appears in the blank fixture
- Send a first chat message and verify transcript persistence
- Open Tasks, Workspace, and AMBITION panels
- Compare returning fixture context against the blank fixture
`,
  };
}

function writeFile(dest, content) {
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, content);
}

function writeApiKey(dataDir, { force = false } = {}) {
  const keyFile = path.join(dataDir, '.oax-api-key');
  if (fs.existsSync(keyFile) && !force) return false;
  ensureDir(path.dirname(keyFile));
  fs.writeFileSync(keyFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return true;
}

function createDataScaffold(dataDir, { force = false } = {}) {
  if (force) fs.rmSync(dataDir, { recursive: true, force: true });
  for (const sub of [
    'agents/default',
    'memory/topics',
    'workspace',
    'workspace/desk',
    'workspace/files',
    'workspace/generated',
    'logs',
  ]) {
    ensureDir(path.join(dataDir, sub));
  }

  const maybeCopy = (srcName, destParts) => {
    const src = path.join(EXAMPLES_DIR, srcName);
    const dest = path.join(dataDir, ...destParts);
    if (fs.existsSync(dest) && !force) return;
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  };

  maybeCopy('SOUL.example.md', ['agents', 'default', 'SOUL.md']);
  maybeCopy('AMBITION.example.md', ['AMBITION.md']);
  maybeCopy('TASKS.example.md', ['TASKS.md']);

  const indexPath = path.join(dataDir, 'memory', 'index.json');
  if (!fs.existsSync(indexPath) || force) {
    writeFile(indexPath, JSON.stringify({ version: '1.0', topics: [] }, null, 2));
  }

  const restlessPath = path.join(dataDir, 'RESTLESS.log.md');
  if (!fs.existsSync(restlessPath) || force) {
    writeFile(
      restlessPath,
      '# RESTLESS Heartbeat Log\n\n' +
        'Append-only log of the agent\'s heartbeat ticks. See `docs/RESTLESS.md` for\n' +
        'the protocol. Trimmed to the most recent 50 entries.\n\n' +
        '<!-- heartbeat-log-start -->\n<!-- heartbeat-log-end -->\n'
    );
  }

  writeApiKey(dataDir, { force });
}

function ensureDatabase({ dataDir, databaseUrl, force = false, generate = false, quiet = false }) {
  const dbPath = path.join(dataDir, 'oax.db');
  if (fs.existsSync(dbPath) && !force) return false;
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    PRISMA_HIDE_UPDATE_MESSAGE: '1',
  };
  const usesDefaultDataRoot = path.resolve(dataDir) === path.resolve(BASE_DATA_DIR);

  if (usesDefaultDataRoot) {
    if (generate) {
      execSync('npx prisma generate', {
        cwd: OAX_WEB,
        env,
        stdio: quiet ? 'pipe' : 'inherit',
      });
    }
    execSync('npx prisma db push', {
      cwd: OAX_WEB,
      env,
      stdio: quiet ? 'pipe' : 'inherit',
    });
    return true;
  }

  const schemaSql = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "ChatSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "TranscriptEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "searchTags" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TranscriptEntry_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ChatSession" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
`;

  execFileSync(
    'npx',
    ['prisma', 'db', 'execute', '--stdin', '--schema', 'prisma/schema.prisma'],
    {
      cwd: OAX_WEB,
      env,
      input: schemaSql,
      stdio: quiet ? 'pipe' : ['pipe', 'inherit', 'inherit'],
    }
  );
  return true;
}

function getPrismaClientCtor() {
  const clientPath = path.join(OAX_WEB, 'node_modules', '@prisma', 'client');
  return require(clientPath).PrismaClient;
}

async function seedReturningSession({ profile, databaseUrl }) {
  const PrismaClient = getPrismaClientCtor();
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const sessionId = devSessionId(profile);
  try {
    await prisma.transcriptEntry.deleteMany({ where: { sessionId } });
    await prisma.chatSession.deleteMany({ where: { id: sessionId } });
    await prisma.chatSession.create({
      data: { id: sessionId, agentId: 'default', model: 'llama3' },
    });
    await prisma.transcriptEntry.createMany({
      data: [
        {
          sessionId,
          role: 'user',
          content: 'Can you help me tighten the onboarding loop for new users?',
        },
        {
          sessionId,
          role: 'assistant',
          content:
            'Yes. The fastest win is an isolated sandbox profile so you can replay onboarding without touching your personal state.',
        },
        {
          sessionId,
          role: 'user',
          content: 'I also want a cleaner way to check whether seeded state feels realistic.',
        },
        {
          sessionId,
          role: 'assistant',
          content:
            'Use separate blank, seeded, and returning fixtures so each test starts from a known state.',
        },
      ],
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function applyFixture({ profile, fixture, dataDir, databaseUrl }) {
  const soulPath = path.join(dataDir, 'agents', 'default', 'SOUL.md');
  const ambitionPath = path.join(dataDir, 'AMBITION.md');
  const tasksPath = path.join(dataDir, 'TASKS.md');
  const themesPath = path.join(dataDir, 'themes.json');
  const memoryIndexPath = path.join(dataDir, 'memory', 'index.json');
  const topicsDir = path.join(dataDir, 'memory', 'topics');
  const generatedDir = path.join(dataDir, 'workspace', 'generated');

  if (fixture === 'blank') {
    fs.rmSync(soulPath, { force: true });
    writeFile(ambitionPath, blankAmbitionContent());
    writeFile(tasksPath, blankTasksContent());
    writeFile(memoryIndexPath, JSON.stringify({ version: '1.0', topics: [] }, null, 2));
    fs.rmSync(themesPath, { force: true });
    return;
  }

  writeFile(soulPath, seededSoulContent());
  writeFile(tasksPath, blankTasksContent());
  writeFile(ambitionPath, blankAmbitionContent());
  writeFile(memoryIndexPath, JSON.stringify({ version: '1.0', topics: [] }, null, 2));
  fs.rmSync(themesPath, { force: true });

  if (fixture !== 'returning') return;

  const topic = returningTopic();
  writeFile(path.join(topicsDir, topic.fileName), topic.content);
  writeFile(
    memoryIndexPath,
    JSON.stringify(
      {
        version: '1.0',
        topics: [
          {
            title: topic.title,
            summary: topic.summary,
            tags: topic.tags,
            sourcePath: topic.sourcePath,
          },
        ],
      },
      null,
      2
    )
  );
  writeFile(
    themesPath,
    JSON.stringify(
      {
        themes: [
          {
            tag: 'onboarding',
            firstSeen: new Date().toISOString(),
            lastEngaged: new Date().toISOString(),
            strength: 0.8,
          },
          {
            tag: 'sandbox',
            firstSeen: new Date().toISOString(),
            lastEngaged: new Date().toISOString(),
            strength: 0.72,
          },
        ],
      },
      null,
      2
    )
  );
  const workspaceFile = returningWorkspaceFile();
  writeFile(path.join(generatedDir, workspaceFile.name), workspaceFile.content);
  writeFile(ambitionPath, returningAmbitionContent());
  writeFile(tasksPath, returningTasksContent());
  await seedReturningSession({ profile, databaseUrl });
}

function ensureProfileOverlay(profile, { force = false } = {}) {
  const { envPath } = profilePaths(profile);
  writeOverlayEnv(
    envPath,
    {
      TELEGRAM_TOKEN: '',
    },
    { force }
  );
  return envPath;
}

async function resetProfileFixture(profile, fixture, { quiet = false } = {}) {
  const paths = profilePaths(profile);
  ensureProfileOverlay(paths.profile);
  createDataScaffold(paths.dataDir, { force: true });
  ensureDatabase({
    dataDir: paths.dataDir,
    databaseUrl: databaseUrlForDataDir(paths.dataDir),
    force: true,
    quiet,
  });
  await applyFixture({
    profile: paths.profile,
    fixture,
    dataDir: paths.dataDir,
    databaseUrl: databaseUrlForDataDir(paths.dataDir),
  });
  return paths;
}

function buildSandboxEnv(profile, { port = 3001 } = {}) {
  const paths = profilePaths(profile);
  ensureProfileOverlay(paths.profile);
  const base = parseEnvFile(BASE_ENV_PATH);
  const overlay = parseEnvFile(paths.envPath);
  return {
    ...process.env,
    ...base,
    ...overlay,
    OAX_PROFILE: paths.profile,
    OAX_DATA_ROOT: paths.dataDir,
    OAX_RUNTIME_ENV_PATH: paths.envPath,
    DATABASE_URL: databaseUrlForDataDir(paths.dataDir),
    PORT: String(port),
    TELEGRAM_TOKEN: '',
    NEXT_PUBLIC_OAX_DEV_SESSION_ID: devSessionId(paths.profile),
  };
}

function profileExists(profile) {
  const { dataDir } = profilePaths(profile);
  return fs.existsSync(dataDir);
}

module.exports = {
  REPO_ROOT,
  OAX_WEB,
  BASE_DATA_DIR,
  BASE_ENV_PATH,
  sanitizeProfileName,
  profilePaths,
  devSessionId,
  databaseUrlForDataDir,
  parseEnvFile,
  ensureWebEnvFile,
  ensureProfileOverlay,
  createDataScaffold,
  ensureDatabase,
  writeApiKey,
  resetProfileFixture,
  buildSandboxEnv,
  profileExists,
};
