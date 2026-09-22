import { Request, Response } from 'express';

export const authService = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    res.json({ token: 'jwt-token-here', user: { email } });
  },

  async register(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    res.status(201).json({ user: { email } });
  },
};
