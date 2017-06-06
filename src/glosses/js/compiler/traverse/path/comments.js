// This file contains methods responsible for dealing with comments.

const { is } = adone;

/**
 * Share comments amongst siblings.
 */
export const shareCommentsWithSiblings = function () {
    // NOTE: this assumes numbered keys
    if (is.string(this.key)) {
        return;
    }

    const node = this.node;
    if (!node) {
        return;
    }

    const trailing = node.trailingComments;
    const leading = node.leadingComments;
    if (!trailing && !leading) {
        return;
    }

    let prev = this.getSibling(this.key - 1);
    let next = this.getSibling(this.key + 1);

    if (!prev.node) {
        prev = next;
    }
    if (!next.node) {
        next = prev;
    }

    prev.addComments("trailing", leading);
    next.addComments("leading", trailing);
};

export const addComment = function (type, content, line) {
    this.addComments(type, [{
        type: line ? "CommentLine" : "CommentBlock",
        value: content
    }]);
};

/**
 * Give node `comments` of the specified `type`.
 */

export const addComments = function (type, comments) {
    if (!comments) {
        return;
    }

    const node = this.node;
    if (!node) {
        return;
    }

    const key = `${type}Comments`;

    if (node[key]) {
        node[key] = node[key].concat(comments);
    } else {
        node[key] = comments;
    }
};
