import express from 'express';
import { loggerMiddleware } from './middleware/logger';
import { authService } from './services/auth';
import { usersService } from './services/users';

export function createServer() {
  const app = express();

  app.use(express.json());
  app.use(loggerMiddleware);

  app.post('/auth/login', authService.login);
  app.post('/auth/register', authService.register);

  app.get('/users', usersService.list);
  app.get('/users/:id', usersService.get);
  app.post('/users', usersService.create);
  app.put('/users/:id', usersService.update);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
