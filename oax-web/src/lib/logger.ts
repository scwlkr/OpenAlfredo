import fs from 'fs';
import path from 'path';
import { LOGS_DIR } from './paths';

export const logInfo = (event: string, data: any) => {
  writeLog('INFO', event, data);
};

export const logError = (event: string, error: any) => {
  writeLog('ERROR', event, error);
};

function writeLog(level: string, event: string, data: any) {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      data
    };
    
    // Ensure logs directory exists
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const logPath = path.join(LOGS_DIR, `oax-${today}.jsonl`);
    
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  } catch (err) {
    console.error('Failed to write log', err);
  }
}
