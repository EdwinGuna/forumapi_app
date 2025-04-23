const ToggleLikeUseCase = require('../../../../Applications/use_case/ToggleLikeUseCase');

class LikeHandler {
    constructor(container) {
        this._container = container;
        this.putLikeHandler = this.putLikeHandler.bind(this);
    }

    async putLikeHandler(request, h) {
        const { commentId, threadId } = request.params;
        const { id: owner } = request.auth.credentials;

        const toggleLikeUseCase = this._container.getInstance(ToggleLikeUseCase.name);
        await toggleLikeUseCase.execute({ threadId, commentId, owner });

        return {
            status : 'success',
        };
    }
}

module.exports = LikeHandler;