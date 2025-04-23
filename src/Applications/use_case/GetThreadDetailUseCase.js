const CommentDetail = require('../../Domains/comments/entities/CommentDetail');
const ReplyDetail = require('../../Domains/replies/entities/ReplyDetail');
const ThreadDetail = require('../../Domains/threads/entities/ThreadDetail');
const { mapDBToReplyModel, mapDBToCommentModel, mapDBToThreadModel } = require('../../Infrastructures/utils');

class GetThreadDetailUseCase {
  constructor({
    threadRepository, commentRepository, replyRepository, likeRepository,
  }) {
    this._threadRepository = threadRepository;
    this._commentRepository = commentRepository;
    this._replyRepository = replyRepository;
    this._likeRepository = likeRepository;
  }

  async execute({ threadId }) {
    const thread = await this._threadRepository.getThreadById(threadId);
    const comments = await this._commentRepository.getCommentsByThreadId(threadId);

    // ✅ Gunakan Promise.all untuk mempercepat proses pengambilan replies
    const repliesArray = await Promise.all(
      comments.map((comment) => this._replyRepository.getRepliesByCommentId(comment.id)),
    );

    const likeCounts = await Promise.all(
      comments.map((comment) => this._likeRepository.getLikeCountByCommentId(comment.id)),
    );

    const enrichedComments = comments.map((comment, index) => {
      const replies = (repliesArray[index] || []).map((reply) => {
        const mapped = mapDBToReplyModel(reply);
        return new ReplyDetail(mapped);
      });

      const likeCount = likeCounts[index];

      return new CommentDetail({
        ...mapDBToCommentModel(comment),
        likeCount,
        replies,
      });
    });

    return new ThreadDetail({
      ...mapDBToThreadModel(thread),
      comments: enrichedComments,
    });
  }
}

module.exports = GetThreadDetailUseCase;
