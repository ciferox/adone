/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
export default class Cancel {
    constructor(message) {
        this.message = message;
    }

    toString() {
        return `Cancel${this.message ? `: ${this.message}` : ""}`;
    }
}

Cancel.prototype[Symbol.for("adone:request:cancel")] = true;