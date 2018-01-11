const {
    vcs: { git: { native } }
} = adone;

const Oid = native.Oid;

// Backwards compatibility.
Object.defineProperties(Oid.prototype, {
    allocfmt: {
        value: Oid.prototype.tostrS,
        enumerable: false
    },
    toString: {
        value: Oid.prototype.tostrS,
        enumerable: false
    }
});

Oid.prototype.copy = function () {
    return this.cpy(); // seriously???
};

Oid.prototype.inspect = function () {
    return `[Oid ${this.allocfmt()}]`;
};

export default Oid;
