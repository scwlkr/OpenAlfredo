const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const {
  TURBOPACK_INVALIDATION_MARKER,
  classifyTurbopackEntries,
  repairTurbopackCache,
} = require('./turbopack-cache');

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oax-turbopack-cache-'));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('classifyTurbopackEntries accepts current Turbopack persistence files', () => {
  withTempDir((rootDir) => {
    const shardDir = path.join(rootDir, '8d0f77bfa');
    fs.mkdirSync(shardDir, { recursive: true });

    for (const file of [
      'CURRENT',
      'LOG',
      'LOCK',
      'LOG.old',
      'MANIFEST-0001',
      'OPTIONS-0007',
      '00000001.meta',
      '00000002.sst',
      '00000003.del',
      '00000004.blob',
    ]) {
      fs.writeFileSync(path.join(shardDir, file), '');
    }

    const result = classifyTurbopackEntries(rootDir);
    assert.equal(result.invalidationMarkers.length, 0);
    assert.equal(result.suspiciousEntries.length, 0);
    assert.equal(result.unknownEntries.length, 0);
  });
});

test('repairTurbopackCache clears the cache when Turbopack leaves an invalidation marker', () => {
  withTempDir((rootDir) => {
    fs.mkdirSync(path.join(rootDir, '8d0f77bfa'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, TURBOPACK_INVALIDATION_MARKER), '{}');

    const warnings = [];
    const result = repairTurbopackCache(rootDir, { warn: (message) => warnings.push(message) });

    assert.equal(result.action, 'cleared-invalidated');
    assert.equal(fs.existsSync(rootDir), false);
    assert.match(warnings.join('\n'), /filesystem cache as invalid/i);
  });
});

test('repairTurbopackCache clears malformed copy-suffixed cache files', () => {
  withTempDir((rootDir) => {
    const shardDir = path.join(rootDir, '8d0f77bfa');
    fs.mkdirSync(shardDir, { recursive: true });
    fs.writeFileSync(path.join(shardDir, '00000007 2'), '');

    const result = repairTurbopackCache(rootDir, { warn() {} });
    assert.equal(result.action, 'cleared-suspicious');
    assert.equal(fs.existsSync(rootDir), false);
  });
});

test('repairTurbopackCache preserves unknown entries instead of wiping on a stale allowlist', () => {
  withTempDir((rootDir) => {
    const shardDir = path.join(rootDir, '8d0f77bfa');
    fs.mkdirSync(shardDir, { recursive: true });
    fs.writeFileSync(path.join(shardDir, '00000008.meta'), '');
    fs.writeFileSync(path.join(shardDir, 'future.cache'), '');

    const warnings = [];
    const result = repairTurbopackCache(rootDir, { warn: (message) => warnings.push(message) });

    assert.equal(result.action, 'warn-unknown');
    assert.equal(fs.existsSync(rootDir), true);
    assert.match(warnings.join('\n'), /leaving the cache intact/i);
  });
});
