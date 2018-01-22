const {
    assert,
    net: { spdy: { utils } }
} = adone;

const debug = require("debug")("spdy:priority");

const {
    is
} = adone;

const compareChildren = (a, b) => a.weight === b.weight ? a.id - b.id : a.weight - b.weight;

class PriorityNode {
    constructor(tree, options) {
        this.tree = tree;

        this.id = options.id;
        this.parent = options.parent;
        this.weight = options.weight;

        // To be calculated in `addChild`
        this.priorityFrom = 0;
        this.priorityTo = 1;
        this.priority = 1;

        this.children = {
            list: [],
            weight: 0
        };

        if (!is.null(this.parent)) {
            this.parent.addChild(this);
        }
    }

    toJSON() {
        return {
            parent: this.parent,
            weight: this.weight,
            exclusive: this.exclusive
        };
    }

    getPriority() {
        return this.priority;
    }

    getPriorityRange() {
        return { from: this.priorityFrom, to: this.priorityTo };
    }

    addChild(child) {
        child.parent = this;
        utils.binaryInsert(this.children.list, child, compareChildren);
        this.children.weight += child.weight;

        this._updatePriority(this.priorityFrom, this.priorityTo);
    }

    remove() {
        assert(this.parent, "Can't remove root node");

        this.parent.removeChild(this);
        this.tree._removeNode(this);

        // Move all children to the parent
        for (let i = 0; i < this.children.list.length; i++) {
            this.parent.addChild(this.children.list[i]);
        }
    }

    removeChild(child) {
        this.children.weight -= child.weight;
        const index = utils.binarySearch(this.children.list, child, compareChildren);
        assert(index !== -1);

        // Remove the child
        this.children.list.splice(index, 1);
    }

    removeChildren() {
        const children = this.children.list;
        this.children.list = [];
        this.children.weight = 0;
        return children;
    }

    _updatePriority(from, to) {
        this.priority = to - from;
        this.priorityFrom = from;
        this.priorityTo = to;

        let weight = 0;
        for (let i = 0; i < this.children.list.length; i++) {
            const node = this.children.list[i];
            const nextWeight = weight + node.weight;

            node._updatePriority(
                from + this.priority * (weight / this.children.weight),
                from + this.priority * (nextWeight / this.children.weight)
            );
            weight = nextWeight;
        }
    }
}

export default class PriorityTree {
    constructor(options) {
        this.map = {};
        this.list = [];
        this.defaultWeight = options.defaultWeight || 16;

        this.count = 0;
        this.maxCount = options.maxCount;

        // Root
        this.root = this.add({
            id: 0,
            parent: null,
            weight: 1
        });
    }

    add(options) {
        if (options.id === options.parent) {
            return this.addDefault(options.id);
        }

        const parent = is.null(options.parent) ? null : this.map[options.parent];
        if (is.undefined(parent)) {
            return this.addDefault(options.id);
        }

        debug("add node=%d parent=%d weight=%d exclusive=%d",
            options.id,
            is.null(options.parent) ? -1 : options.parent,
            options.weight || this.defaultWeight,
            options.exclusive ? 1 : 0);

        let children;
        if (options.exclusive) {
            children = parent.removeChildren();
        }

        const node = new PriorityNode(this, {
            id: options.id,
            parent,
            weight: options.weight || this.defaultWeight
        });
        this.map[options.id] = node;

        if (options.exclusive) {
            for (let i = 0; i < children.length; i++) {
                node.addChild(children[i]);
            }
        }

        this.count++;
        if (this.count > this.maxCount) {
            debug("hit maximum remove id=%d", this.list[0].id);
            this.list.shift().remove();
        }

        // Root node is not subject to removal
        if (!is.null(node.parent)) {
            this.list.push(node);
        }

        return node;
    }

    // Only for testing, should use `node`'s methods
    get(id) {
        return this.map[id];
    }

    addDefault(id) {
        debug("creating default node");
        return this.add({ id, parent: 0, weight: this.defaultWeight });
    }

    _removeNode(node) {
        delete this.map[node.id];
        this.count--;
    }

    static create(options) {
        return new PriorityTree(options);
    }
}
