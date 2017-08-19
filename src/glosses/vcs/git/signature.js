const native = adone.bind("git.node");

const {
    promise: { promisifyAll }
} = adone;

const Signature = native.Signature;

Signature.prototype.dup = promisifyAll(Signature.prototype.dup);
Signature.fromBuffer = promisifyAll(Signature.fromBuffer);

/**
 * Standard string representation of an author.
 *
 * @return {string} Representation of the author.
 */
Signature.prototype.toString = function () {
    return `${this.name().toString()} <${this.email().toString()}>`;
};

export default Signature;
