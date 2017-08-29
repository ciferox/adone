const { fs } = adone;

export default class SymbolicLinkDirectory extends adone.fs.Directory {
    realpath() {
        return fs.realpath(this.path());
    }

    unlink() {
        return adone.fs.File.prototype.unlink.call(this);
    }
}
