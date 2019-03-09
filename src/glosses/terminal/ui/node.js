export default class Node extends adone.terminal.ui.EventEmitter {
    constructor(options = {}) {
        super();
        const Screen = adone.terminal.ui.Screen;
        this.options = options;

        this.screen = this.screen || options.screen;

        if (!this.screen) {
            if (this.type === "screen") {
                this.screen = this;
            } else if (Screen.total === 1) {
                this.screen = Screen.global;
            } else if (options.parent) {
                this.screen = options.parent;
                while (this.screen && this.screen.type !== "screen") {
                    this.screen = this.screen.parent;
                }
            } else if (Screen.total) {
                // This _should_ work in most cases as long as the element is appended
                // synchronously after the screen's creation. Throw error if not.
                this.screen = Screen.instances[Screen.instances.length - 1];
                process.nextTick(() => {
                    if (!this.parent) {
                        throw new Error(`Element (${this.type})`
                            + " was not appended synchronously after the"
                            + " screen's creation. Please set a `parent`"
                            + " or `screen` option in the element's constructor"
                            + " if you are going to use multiple screens and"
                            + " append the element later.");
                    }
                });
            } else {
                throw new Error("No active screen.");
            }
        }

        this.parent = options.parent || null;
        this.children = [];
        this.$ = this._ = this.data = adone.o();
        this.uid = Node.uid++;
        this.index = !is.nil(this.index) ? this.index : -1;

        if (this.type !== "screen") {
            this.detached = true;
        }

        if (this.parent) {
            this.parent.append(this);
        }

        (options.children || []).forEach(this.append.bind(this));
    }

    insert(element, i) {
        if (element.screen && element.screen !== this.screen) {
            throw new Error("Cannot switch a node's screen.");
        }

        element.detach();
        element.parent = this;
        element.screen = this.screen;

        if (i === 0) {
            this.children.unshift(element);
        } else if (i === this.children.length) {
            this.children.push(element);
        } else {
            this.children.splice(i, 0, element);
        }

        element.emit("reparent", this);
        this.emit("adopt", element);

        const emit = (el) => {
            const n = el.detached !== this.detached;
            el.detached = this.detached;
            if (n) {
                el.emit("attach");
            }
            el.children.forEach(emit);
        };
        emit(element);

        if (!this.screen.focused) {
            this.screen.focused = element;
        }
    }

    prepend(element) {
        this.insert(element, 0);
    }

    append(element) {
        this.insert(element, this.children.length);
    }

    insertBefore(element, other) {
        const i = this.children.indexOf(other);
        if (~i) {
            this.insert(element, i);
        }
    }

    insertAfter(element, other) {
        const i = this.children.indexOf(other);
        if (~i) {
            this.insert(element, i + 1);
        }
    }

    remove(element) {
        if (element.parent !== this) {
            return;
        }

        let i = this.children.indexOf(element);
        if (!~i) {
            return;
        }

        element.clearPos();

        element.parent = null;

        this.children.splice(i, 1);

        i = this.screen.clickable.indexOf(element);
        if (~i) {
            this.screen.clickable.splice(i, 1);
        }
        i = this.screen.keyable.indexOf(element);
        if (~i) {
            this.screen.keyable.splice(i, 1);
        }

        element.emit("reparent", null);
        this.emit("remove", element);

        (function emit(el) {
            const n = el.detached !== true;
            el.detached = true;
            if (n) {
                el.emit("detach");
            }
            el.children.forEach(emit);
        })(element);

        if (this.screen.focused === element) {
            this.screen.rewindFocus();
        }
    }

    detach() {
        if (this.parent) {
            this.parent.remove(this);
        }
    }

    free() {
        
    }

    destroy() {
        this.detach();
        this.forDescendants((el) => {
            el.free();
            el.destroyed = true;
            el.emit("destroy");
        }, this);
    }

    forDescendants(iter, s) {
        if (s) {
            iter(this);
        }
        this.children.forEach(function emit(el) {
            iter(el);
            el.children.forEach(emit);
        });
    }

    forAncestors(iter, s) {
        let el = this;
        if (s) {
            iter(this);
        }
        while (el = el.parent) {
            iter(el);
        }
    }

    collectDescendants(s) {
        const out = [];
        this.forDescendants((el) => {
            out.push(el);
        }, s);
        return out;
    }

    collectAncestors(s) {
        const out = [];
        this.forAncestors((el) => {
            out.push(el);
        }, s);
        return out;
    }

    emitDescendants() {
        const args = Array.prototype.slice(arguments);
        let iter;

        if (is.function(args[args.length - 1])) {
            iter = args.pop();
        }

        return this.forDescendants((el) => {
            if (iter) {
                iter(el);
            }
            el.emit.apply(el, args);
        }, true);
    }

    emitAncestors() {
        const args = Array.prototype.slice(arguments);
        let iter;

        if (is.function(args[args.length - 1])) {
            iter = args.pop();
        }

        return this.forAncestors((el) => {
            if (iter) {
                iter(el);
            }
            el.emit.apply(el, args);
        }, true);
    }

    hasDescendant(target) {
        return (function find(el) {
            for (let i = 0; i < el.children.length; i++) {
                if (el.children[i] === target) {
                    return true;
                }
                if (find(el.children[i]) === true) {
                    return true;
                }
            }
            return false;
        })(this);
    }

    hasAncestor(target) {
        let el = this.parent;
        while (el) {
            if (el === target) {
                return true;
            }
            el = el.parent;
        }
        return false;
    }

    get(name, value) {
        if (this.data.hasOwnProperty(name)) {
            return this.data[name];
        }
        return value;
    }

    set(name, value) {
        return this.data[name] = value;
    }
}
Node.uid = 0;
Node.prototype.type = "node";
