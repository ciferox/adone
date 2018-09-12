/**
 * This class is responsible for a binding inside of a scope.
 *
 * It tracks the following:
 *
 *  * Node path.
 *  * Amount of times referenced by other nodes.
 *  * Paths to nodes that reassign or modify this binding.
 *  * The kind of binding. (Is it a parameter, declaration etc)
 */

export default class Binding {
    constructor({ identifier, scope, path, kind }) {
        this.identifier = identifier;
        this.scope = scope;
        this.path = path;
        this.kind = kind;

        this.constantViolations = [];
        this.constant = true;

        this.referencePaths = [];
        this.referenced = false;
        this.references = 0;

        this.clearValue();
    }

    //   constantViolations: Array<NodePath>;

    //   constant: boolean;

    //   referencePaths: Array<NodePath>;

    //   referenced: boolean;

    //   references: number;

    //   hasDeoptedValue: boolean;

    //   hasValue: boolean;

    //   value;

    deoptValue() {
        this.clearValue();
        this.hasDeoptedValue = true;
    }

    setValue(value) {
        if (this.hasDeoptedValue) {
            return;
        }
        this.hasValue = true;
        this.value = value;
    }

    clearValue() {
        this.hasDeoptedValue = false;
        this.hasValue = false;
        this.value = null;
    }

    /**
     * Register a constant violation with the provided `path`.
     */

    reassign(path) {
        this.constant = false;
        if (this.constantViolations.includes(path)) {
            return;
        }
        this.constantViolations.push(path);
    }

    /**
     * Increment the amount of references to this binding.
     */

    reference(path) {
        if (this.referencePaths.includes(path)) {
            return;
        }
        this.referenced = true;
        this.references++;
        this.referencePaths.push(path);
    }

    /**
     * Decrement the amount of references to this binding.
     */

    dereference() {
        this.references--;
        this.referenced = Boolean(this.references);
    }
}
