const bcrypt = require('bcrypt');
const UsersTableTestHelper = require('../UsersTableTestHelper');
const pool = require('../../src/Infrastructures/database/postgres/pool');
const ServerTestHelper = require('../ServerTestHelper');

describe('ServerTestHelper (tanpa mock)', () => {
  afterEach(async () => {
    await UsersTableTestHelper.cleanTable();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should return existing userId if username already exists', async () => {
    const hashedPassword = await bcrypt.hash('secret', 10);

    await UsersTableTestHelper.addUser({
      id: 'user-existing',
      username: 'existinguser',
      password: hashedPassword,
      fullname: 'Test Existing',
    });

    const result = await ServerTestHelper.getAccessToken({
      id: 'user-xxx', // id diabaikan
      username: 'existinguser',
    });

    expect(result).toHaveProperty('userId', 'user-existing');
    expect(result).toHaveProperty('accessToken');
  });
});

describe('ServerTestHelper (mocked)', () => {
  beforeAll(() => {
    jest.resetModules(); // penting agar cache createServer hilang

    jest.mock('../../src/Infrastructures/http/createServer', () => () => ({
      inject: jest.fn().mockResolvedValue({
        statusCode: 500,
        payload: 'Internal Server Error',
      }),
    }));
  });

  it('should throw error if user creation fails unexpectedly', async () => {
    // const ServerTestHelper = require('../ServerTestHelper'); // di-require setelah mock
    await expect(
      ServerTestHelper.getAccessToken({ id: 'fail-id', username: 'failuser' }),
    ).rejects.toThrow('Gagal membuat user untuk test!');
  });

  describe('validateLoginResponse', () => {
    it('should throw error when login response has no data', () => {
      const badResponse = {
        statusCode: 201,
        payload: JSON.stringify({}), // tidak ada data
      };

      expect(() => ServerTestHelper._testOnly.validateLoginResponse(badResponse))
        .toThrow('Gagal mendapatkan accessToken. Pastikan username dan password sesuai.');
    });

    it('should throw error when login response has wrong status code', () => {
      const badResponse = {
        statusCode: 400,
        payload: JSON.stringify({ data: { accessToken: 'token' } }),
      };

      expect(() => ServerTestHelper._testOnly.validateLoginResponse(badResponse))
        .toThrow('Gagal mendapatkan accessToken. Pastikan username dan password sesuai.');
    });
  });

  it('should work with default parameters when no argument is provided', async () => {
    jest.resetModules();
    jest.doMock('../../src/Infrastructures/http/createServer', () => () => ({
      inject: jest
        .fn()
        .mockResolvedValueOnce({
          statusCode: 201,
          payload: JSON.stringify({
            data: { addedUser: { id: 'user-default' } },
          }),
        })
        .mockResolvedValueOnce({
          statusCode: 201,
          payload: JSON.stringify({
            data: { accessToken: 'default-access-token' },
          }),
        }),
    }));

    // eslint-disable-next-line global-require
    const ServerTestHelperMocked = require('../ServerTestHelper');
    const result = await ServerTestHelperMocked.getAccessToken(); // <-- Tanpa argumen

    expect(result).toHaveProperty('accessToken', 'default-access-token');
    expect(result).toHaveProperty('userId', 'user-default');
  });

  it('should throw error if username not found in database after 400 response', async () => {
    // Mock inject() supaya return 400 dan mengandung kata 'username'
    jest.resetModules();
    jest.doMock('../../src/Infrastructures/http/createServer', () => {
      return () => ({
        inject: jest.fn().mockResolvedValue({
          statusCode: 400,
          payload: 'username already exists',
        }),
      });
    });
  
    const pool = require('../../src/Infrastructures/database/postgres/pool');
    const ServerTestHelper = require('../ServerTestHelper');
  
    // Mock pool.query agar return rowCount = 0
    jest.spyOn(pool, 'query').mockResolvedValueOnce({ rowCount: 0, rows: [] });
  
    await expect(ServerTestHelper.getAccessToken({ username: 'existinguser' }))
      .rejects.toThrow('User with username "existinguser" not found in database after creation attempt.');
  
    pool.query.mockRestore();
  });
  
});
