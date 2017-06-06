// This file contains methods responsible for removing a node.

import { hooks } from "./lib/removal_hooks";

const { is } = adone;

export const remove = function () {
    this._assertUnremoved();

    this.resync();

    if (this._callRemovalHooks()) {
        this._markRemoved();
        return;
    }

    this.shareCommentsWithSiblings();
    this._remove();
    this._markRemoved();
};

export const _callRemovalHooks = function () {
    for (const fn of hooks) {
        if (fn(this, this.parentPath)) {
            return true;
        }
    }
};

export const _remove = function () {
    if (is.array(this.container)) {
        this.container.splice(this.key, 1);
        this.updateSiblingKeys(this.key, -1);
    } else {
        this._replaceWith(null);
    }
};

export const _markRemoved = function () {
    this.shouldSkip = true;
    this.removed = true;
    this.node = null;
};

export const _assertUnremoved = function () {
    if (this.removed) {
        throw this.buildCodeFrameError("NodePath has been removed so is read-only.");
    }
};
