import Parser from "./index";
import { SourceLocation } from "../util/location";

// Start an AST node, attaching a start offset.

const pp = Parser.prototype;
const commentKeys = ["leadingComments", "trailingComments", "innerComments"];

class Node {
    constructor(pos, loc, filename) {
        this.type = "";
        this.start = pos;
        this.end = 0;
        this.loc = new SourceLocation(loc);
        if (filename) {
            this.loc.filename = filename;
        }
    }

    __clone() {
        const node2 = new Node();
        for (const key in this) {
            // Do not clone comments that are already attached to the node
            if (commentKeys.indexOf(key) < 0) {
                node2[key] = this[key];
            }
        }

        return node2;
    }
}

pp.startNode = function () {
    return new Node(this.state.start, this.state.startLoc, this.filename);
};

pp.startNodeAt = function (pos, loc) {
    return new Node(pos, loc, this.filename);
};

const finishNodeAt = function (node, type, pos, loc) {
    node.type = type;
    node.end = pos;
    node.loc.end = loc;
    this.processComment(node);
    return node;
};

// Finish an AST node, adding `type` and `end` properties.

pp.finishNode = function (node, type) {
    return finishNodeAt.call(this, node, type, this.state.lastTokEnd, this.state.lastTokEndLoc);
};

// Finish node at given position

pp.finishNodeAt = function (node, type, pos, loc) {
    return finishNodeAt.call(this, node, type, pos, loc);
};
