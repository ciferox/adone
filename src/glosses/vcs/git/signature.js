const native = adone.bind("git.node");

const Signature = native.Signature;

Signature.prototype.dup = adone.promise.promisifyAll(Signature.prototype.dup);
Signature.fromBuffer = adone.promise.promisifyAll(Signature.fromBuffer);

/**
 * Standard string representation of an author.
 *
 * @return {string} Representation of the author.
 */
Signature.prototype.toString = function () {
    return `${this.name().toString()} <${this.email().toString()}>`;
};

export default Signature;
