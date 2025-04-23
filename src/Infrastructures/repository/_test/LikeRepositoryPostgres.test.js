const pool = require('../../../Infrastructures/database/postgres/pool');
const LikesTableTestHelper = require('../../../../tests/LikesTableTestHelper');
const UsersTableTestHelper = require('../../../../tests/UsersTableTestHelper');
const CommentsTableTestHelper = require('../../../../tests/CommentsTableTestHelper');
const ThreadsTableTestHelper = require('../../../../tests/ThreadsTableTestHelper');

const LikeRepositoryPostgres = require('../LikeRepositoryPostgres');
const InvariantError = require('../../../Commons/exceptions/InvariantError');

describe('LikeRepositoryPostgres', () => {
  beforeEach(async () => {
    await LikesTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
    await UsersTableTestHelper.cleanTable();

    await UsersTableTestHelper.addUser({ id: 'user-123' });
    await ThreadsTableTestHelper.addThread({ id: 'thread-123', title: 'ini sebuah thread', body: 'body sebuah thread', owner: 'user-123' });
    await CommentsTableTestHelper.addComment({ id: 'comment-123', threadId: 'thread-123', owner: 'user-123' });
  });  
  
  afterEach(async () => {
    await LikesTableTestHelper.cleanTable();
    await CommentsTableTestHelper.cleanTable();
    await ThreadsTableTestHelper.cleanTable();
    await UsersTableTestHelper.cleanTable();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('likeComment function', () => {
    it('should persist like correctly', async () => {
      // Arrange
      const likeRepository = new LikeRepositoryPostgres(pool);

      // Action
      await likeRepository.likeComment('comment-123', 'user-123');

      // Assert
      const likes = await LikesTableTestHelper.findLike('comment-123', 'user-123');
      expect(likes).toHaveLength(1);
    });

    it('should throw InvariantError when likeComment query fails', async () => {
      // Arrange
      const fakePool = {
        query: jest.fn().mockRejectedValue(new Error('some db error')),
      };

      const likeRepository = new LikeRepositoryPostgres(fakePool);
    
      // Action & Assert
      await expect(likeRepository.likeComment('comment-xxx', 'user-xxx'))
        .rejects
        .toThrowError(InvariantError);
    });
    
  });

  describe('unlikeComment function', () => {
    it('should delete like correctly', async () => {
      // Arrange
      await LikesTableTestHelper.addLike({ commentId: 'comment-123', owner: 'user-123' });

      const likeRepository = new LikeRepositoryPostgres(pool);

      // Action
      await likeRepository.unlikeComment('comment-123', 'user-123');

      // Assert
      const likes = await LikesTableTestHelper.findLike('comment-123', 'user-123');
      expect(likes).toHaveLength(0);
    });
  });

  describe('isCommentLiked function', () => {
    it('should return true when like exists', async () => {
      await LikesTableTestHelper.addLike({ commentId: 'comment-123', owner: 'user-123' });

      const likeRepository = new LikeRepositoryPostgres(pool);
      const isLiked = await likeRepository.isCommentLiked('comment-123', 'user-123');

      expect(isLiked).toBe(true);
    });

    it('should return false when like does not exist', async () => {
      const likeRepository = new LikeRepositoryPostgres(pool);
      const isLiked = await likeRepository.isCommentLiked('comment-123', 'user-123');

      expect(isLiked).toBe(false);
    });
  });

  describe('getLikeCountByCommentId function', () => {
    it('should return correct like count', async () => {
      await UsersTableTestHelper.addUser({ id: 'user-456', username: 'johndoe' });
      
      await LikesTableTestHelper.addLike({ id: 'like-1', commentId: 'comment-123', owner: 'user-123' });
      await LikesTableTestHelper.addLike({ id: 'like-2', commentId: 'comment-123', owner: 'user-456' });

      const likeRepository = new LikeRepositoryPostgres(pool);
      const count = await likeRepository.getLikeCountByCommentId('comment-123');

      expect(count).toBe(2);
    });
  });
});
