import { authService } from '../src/services/auth';

describe('authService', () => {
  it('should login with valid credentials', async () => {
    const req = { body: { email: 'test@example.com', password: 'password' } } as any;
    const res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await authService.login(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({ email: 'test@example.com' }),
      })
    );
  });

  it('should reject missing password', async () => {
    const req = { body: { email: 'test@example.com' } } as any;
    const res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await authService.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
