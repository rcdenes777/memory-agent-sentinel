import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const message = `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`;

    if (config.consoleLogging) {
      console.log(message);
    }
  });

  next();
}
