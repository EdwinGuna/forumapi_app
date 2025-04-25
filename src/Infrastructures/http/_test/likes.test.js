const pool = require('../../database/postgres/pool');
const createServer = require('../createServer');
const UsersTableTestHelper = require('../../../../tests/UsersTableTestHelper');
const ThreadsTableTestHelper = require('../../../../tests/ThreadsTableTestHelper');
const CommentsTableTestHelper = require('../../../../tests/CommentsTableTestHelper');
const LikesTableTestHelper = require('../../../../tests/LikesTableTestHelper');
const ServerTestHelper = require('../../../../tests/ServerTestHelper');
const container = require('../../container');
const { _testOnly } = require('../../../../tests/ServerTestHelper');

describe('/likes endpoint', () => {
  let accessToken;
  let threadId;
  let commentId;

  beforeAll(async () => {
    const userInfo = await ServerTestHelper.getAccessToken();
    accessToken = userInfo.accessToken;
    // const owner = userInfo.username;
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Reset data
    await LikesTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();

    // Tambah thread dan comment
    await UsersTableTestHelper.addUser({ id: 'user-123' });
    await ThreadsTableTestHelper.addThread({
      id: 'thread-123', title: 'ini title', body: 'ini body thread', owner: 'user-123',
    });
    await CommentsTableTestHelper.addComment({ id: 'comment-123', threadId: 'thread-123', owner: 'user-123' });

    threadId = 'thread-123';
    commentId = 'comment-123';
  });

  afterEach(async () => {
    await LikesTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
  });

  it('should respond 200 when toggling like', async () => {
    const server = await createServer(container);

    const response = await server.inject({
      method: 'PUT',
      url: `/threads/${threadId}/comments/${commentId}/likes`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const responseJson = JSON.parse(response.payload);
    expect(response.statusCode).toBe(200);
    expect(responseJson.status).toBe('success');
  });

  it('should add like then remove like on second call', async () => {
    const server = await createServer(container);

    // First toggle = like
    await server.inject({
      method: 'PUT',
      url: `/threads/${threadId}/comments/${commentId}/likes`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let likeCount = await LikesTableTestHelper.countLike(commentId);
    expect(likeCount).toBe(1);

    // Second toggle = unlike
    await server.inject({
      method: 'PUT',
      url: `/threads/${threadId}/comments/${commentId}/likes`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    likeCount = await LikesTableTestHelper.countLike(commentId);
    expect(likeCount).toBe(0);
  });

  it('should return 401 if not logged in', async () => {
    const server = await createServer(container);

    const response = await server.inject({
      method: 'PUT',
      url: `/threads/${threadId}/comments/${commentId}/likes`,
    });

    expect(response.statusCode).toBe(401);
  });

  describe('validateLoginResponse function', () => {
    it('should throw error when data is missing', () => {
      const fakeResponse = {
        statusCode: 201,
        payload: JSON.stringify({}),
      };

      expect(() => {
        _testOnly.validateLoginResponse(fakeResponse);
      }).toThrowError('Gagal mendapatkan accessToken. Pastikan username dan password sesuai.');
    });

    it('should throw error when statusCode is not 201', () => {
      const fakeResponse = {
        statusCode: 400,
        payload: JSON.stringify({ data: { accessToken: 'abc' } }),
      };

      expect(() => {
        _testOnly.validateLoginResponse(fakeResponse);
      }).toThrowError('Gagal mendapatkan accessToken. Pastikan username dan password sesuai.');
    });

    it('should return data when valid', () => {
      const fakeResponse = {
        statusCode: 201,
        payload: JSON.stringify({ data: { accessToken: 'abc' } }),
      };

      const result = _testOnly.validateLoginResponse(fakeResponse);
      expect(result).toEqual({ accessToken: 'abc' });
    });
  });
});
