export interface Config {
  port: number;
  environment: 'development' | 'production';
  database: string;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  consoleLogging: boolean;
  logRotationSizeMb: number;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  environment: (process.env.NODE_ENV as 'development' | 'production') || 'development',
  database: process.env.DATABASE_PATH || './data.db',
  logLevel: (process.env.LOG_LEVEL as any) || 'info',
  consoleLogging: process.env.CONSOLE_LOGGING === 'true',
  logRotationSizeMb: parseInt(process.env.LOG_ROTATION_SIZE_MB || '5', 10),
};
