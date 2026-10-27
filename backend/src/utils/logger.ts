export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const ctx = context ? ` ${JSON.stringify(context)}` : '';
    console.log(`[${timestamp}] [INFO] ${message}${ctx}`);
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const ctx = context ? ` ${JSON.stringify(context)}` : '';
    console.warn(`[${timestamp}] [WARN] ${message}${ctx}`);
  },
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const errDetails = error instanceof Error ? ` Error: ${error.message}` : error ? ` Error: ${String(error)}` : '';
    const ctx = context ? ` Context: ${JSON.stringify(context)}` : '';
    console.error(`[${timestamp}] [ERROR] ${message}${errDetails}${ctx}`);
  },
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      const ctx = context ? ` ${JSON.stringify(context)}` : '';
      console.log(`[${timestamp}] [DEBUG] ${message}${ctx}`);
    }
  },
};
