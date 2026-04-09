const fs = require('fs');
const path = require('path');

const TURBOPACK_INVALIDATION_MARKER = '__turbo_tasks_invalidated_db';
const VALID_TURBOPACK_FILE = /^(CURRENT|LOCK|LOG|LOG\.old|MANIFEST-\d+|OPTIONS-\d+|\d+\.(meta|sst|blob|del))$/;
const SUSPICIOUS_ENTRY_NAME = /\s/;

function summarizeEntries(entries) {
  if (entries.length === 0) return '';
  const preview = entries.slice(0, 5).join(', ');
  const suffix = entries.length > 5 ? `, +${entries.length - 5} more` : '';
  return `${preview}${suffix}`;
}

function isSuspiciousTurbopackEntryName(name) {
  return SUSPICIOUS_ENTRY_NAME.test(name);
}

function classifyTurbopackEntries(rootDir) {
  const invalidationMarkers = [];
  const suspiciousEntries = [];
  const unknownEntries = [];

  if (!fs.existsSync(rootDir)) {
    return {
      hasCache: false,
      invalidationMarkers,
      suspiciousEntries,
      unknownEntries,
    };
  }

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(rootDir, abs);

      if (entry.isDirectory()) {
        if (isSuspiciousTurbopackEntryName(entry.name)) {
          suspiciousEntries.push(rel + path.sep);
          continue;
        }
        walk(abs);
        continue;
      }

      if (entry.name === TURBOPACK_INVALIDATION_MARKER) {
        invalidationMarkers.push(rel);
        continue;
      }

      if (VALID_TURBOPACK_FILE.test(entry.name)) {
        continue;
      }

      if (isSuspiciousTurbopackEntryName(entry.name)) {
        suspiciousEntries.push(rel);
      } else {
        unknownEntries.push(rel);
      }
    }
  };

  walk(rootDir);

  return {
    hasCache: true,
    invalidationMarkers,
    suspiciousEntries,
    unknownEntries,
  };
}

function clearTurbopackCache(rootDir) {
  fs.rmSync(rootDir, { recursive: true, force: true });
}

function repairTurbopackCache(rootDir, logger = console) {
  const status = classifyTurbopackEntries(rootDir);
  if (!status.hasCache) {
    return { action: 'missing', ...status };
  }

  if (status.invalidationMarkers.length > 0) {
    logger.warn('⚠️  Turbopack marked its filesystem cache as invalid after a prior internal error.');
    logger.warn(`   Marker: ${summarizeEntries(status.invalidationMarkers)}`);
    logger.warn('   Clearing oax-web/.next/dev/cache/turbopack before starting Next dev...');
    clearTurbopackCache(rootDir);
    return { action: 'cleared-invalidated', ...status };
  }

  if (status.suspiciousEntries.length > 0) {
    logger.warn('⚠️  Found malformed files in the Turbopack cache.');
    logger.warn(`   Examples: ${summarizeEntries(status.suspiciousEntries)}`);
    logger.warn('   Clearing oax-web/.next/dev/cache/turbopack before starting Next dev...');
    clearTurbopackCache(rootDir);
    return { action: 'cleared-suspicious', ...status };
  }

  if (status.unknownEntries.length > 0) {
    logger.warn('⚠️  Found unrecognized files in the Turbopack cache, but leaving the cache intact.');
    logger.warn(`   Examples: ${summarizeEntries(status.unknownEntries)}`);
    logger.warn('   If Next.js starts failing on cache load, clear oax-web/.next/dev/cache/turbopack manually.');
    return { action: 'warn-unknown', ...status };
  }

  return { action: 'clean', ...status };
}

module.exports = {
  TURBOPACK_INVALIDATION_MARKER,
  VALID_TURBOPACK_FILE,
  classifyTurbopackEntries,
  repairTurbopackCache,
};
