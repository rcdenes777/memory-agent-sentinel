import { Request, Response } from 'express';

const mockUsers = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
];

export const usersService = {
  async list(req: Request, res: Response) {
    res.json(mockUsers);
  },

  async get(req: Request, res: Response) {
    const { id } = req.params;
    const user = mockUsers.find(u => u.id === parseInt(id, 10));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  },

  async create(req: Request, res: Response) {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Missing name or email' });
    }

    const newUser = { id: mockUsers.length + 1, name, email };
    mockUsers.push(newUser);

    res.status(201).json(newUser);
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { name, email } = req.body;
    const user = mockUsers.find(u => u.id === parseInt(id, 10));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;

    res.json(user);
  },
};
