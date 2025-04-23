const pool = require('../src/Infrastructures/database/postgres/pool');

const LikesTableTestHelper = {
    async addLike({ id = 'like-123', commentId, owner }) {
        const query = {
            text: 'INSERT INTO likes(id, comment_id, owner) VALUES($1, $2, $3)',
            values: [id, commentId, owner],
        };

        await pool.query(query);
    },

    async findLike(commentId, owner) {
        const query = {
            text: 'SELECT * FROM likes WHERE comment_id = $1 AND owner = $2',
            values: [commentId, owner],
        };

        const result = await pool.query(query);
        return result.rows;
    },

    async countLike(commentId) {
        const query = {
          text: 'SELECT COUNT(*) FROM likes WHERE comment_id = $1',
          values: [commentId],
        };
      
        const result = await pool.query(query);
        return parseInt(result.rows[0].count, 10);
    },

    async cleanTable() {
        await pool.query('DELETE FROM likes');
    },
};

module.exports = LikesTableTestHelper;