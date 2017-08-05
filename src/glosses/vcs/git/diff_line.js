const native = adone.bind("git.node");

const DiffLine = native.DiffLine;

const _rawContent = DiffLine.prototype.content;

/**
* The relevant line
* @return {String}
*/
DiffLine.prototype.content = function () {
    if (!this._cache) {
        this._cache = {};
    }

    if (!this._cache.content) {
        this._cache.content = Buffer.from(this.rawContent()).slice(0, this.contentLen()).toString("utf8");
    }

    return this._cache.content;
};

/**
* The non utf8 translated text
* @return {String}
*/
DiffLine.prototype.rawContent = function () {
    return _rawContent.call(this);
};

export default DiffLine;