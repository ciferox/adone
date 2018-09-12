// This file contains methods responsible for dealing with comments.
const {
    is,
    js: { compiler: { types: t } }
} = adone;

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

    const prev = this.getSibling(this.key - 1);
    const next = this.getSibling(this.key + 1);
    const hasPrev = Boolean(prev.node);
    const hasNext = Boolean(next.node);
    if (hasPrev && hasNext) {
    } else if (hasPrev) {
        prev.addComments("trailing", trailing);
    } else if (hasNext) {
        next.addComments("leading", leading);
    }
};

export const addComment = function (type, content, line) {
    t.addComment(this.node, type, content, line);
};

/**
 * Give node `comments` of the specified `type`.
 */

export const addComments = function (type, comments) {
    t.addComments(this.node, type, comments);
};
