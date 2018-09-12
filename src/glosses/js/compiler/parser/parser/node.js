import UtilParser from "./util";
import { SourceLocation } from "../util/location";

// Start an AST node, attaching a start offset.

const commentKeys = ["leadingComments", "trailingComments", "innerComments"];

class Node {
    constructor(parser, pos, loc) {
        this.type = "";
        this.start = pos;
        this.end = 0;
        this.loc = new SourceLocation(loc);
        if (parser && parser.options.ranges) {
            this.range = [pos, 0];
        }
        if (parser && parser.filename) {
            this.loc.filename = parser.filename;
        }
    }

    __clone() {
        // $FlowIgnore
        const node2 = new Node();
        Object.keys(this).forEach((key) => {
            // Do not clone comments that are already attached to the node
            if (!commentKeys.includes(key)) {
                // $FlowIgnore
                node2[key] = this[key];
            }
        });

        return node2;
    }
}

export class NodeUtils extends UtilParser {
    startNode() {
        // $FlowIgnore
        return new Node(this, this.state.start, this.state.startLoc);
    }

    startNodeAt(pos, loc) {
        // $FlowIgnore
        return new Node(this, pos, loc);
    }

    /**
     *  Start a new node with a previous node's location.
     */
    startNodeAtNode(type) {
        return this.startNodeAt(type.start, type.loc.start);
    }

    // Finish an AST node, adding `type` and `end` properties.

    finishNode(node, type) {
        return this.finishNodeAt(
            node,
            type,
            this.state.lastTokEnd,
            this.state.lastTokEndLoc,
        );
    }

    // Finish node at given position

    finishNodeAt(
        node,
        type,
        pos,
        loc,
    ) {
        node.type = type;
        node.end = pos;
        node.loc.end = loc;
        if (this.options.ranges) {
            node.range[1] = pos;
        }
        this.processComment(node);
        return node;
    }

    /**
     * Reset the start location of node to the start location of locationNode
     */
    resetStartLocationFromNode(node, locationNode) {
        node.start = locationNode.start;
        node.loc.start = locationNode.loc.start;
        if (this.options.ranges) {
            node.range[0] = locationNode.range[0];
        }
    }
}
