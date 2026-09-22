import { usersService } from '../src/services/users';

describe('usersService', () => {
  it('should list all users', async () => {
    const req = {} as any;
    const res = { json: jest.fn() } as any;

    await usersService.list(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ email: expect.stringContaining('@example.com') }),
    ]));
  });

  it('should get user by id', async () => {
    const req = { params: { id: '1' } } as any;
    const res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    } as any;

    await usersService.get(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });
});
