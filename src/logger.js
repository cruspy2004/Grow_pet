const fs = require('fs');
const path = require('path');

const MAX_LOG_BYTES = 1024 * 1024;

function createLogger(logDir) {
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'app.log');

  function rotateIfNeeded() {
    try {
      const stats = fs.statSync(logFile);
      if (stats.size > MAX_LOG_BYTES) {
        fs.renameSync(logFile, path.join(logDir, 'app.log.1'));
      }
    } catch {
      // no log file yet, nothing to rotate
    }
  }

  function write(level, message, extra) {
    rotateIfNeeded();
    const line = JSON.stringify({
      t: new Date().toISOString(),
      level,
      message: String(message),
      ...(extra && typeof extra === 'object' ? { extra } : {})
    });
    try {
      fs.appendFileSync(logFile, line + '\n', 'utf8');
    } catch {
      // logging must never crash the app
    }
    if (level === 'error') {
      console.error(line);
    } else if (process.env.GROWBUDDY_DEBUG) {
      console.log(line);
    }
  }

  return {
    info: (message, extra) => write('info', message, extra),
    warn: (message, extra) => write('warn', message, extra),
    error: (message, extra) => write('error', message, extra),
    debug: (message, extra) => write('debug', message, extra),
    logFile
  };
}

module.exports = { createLogger };
