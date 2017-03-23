export default class SymbolicLinkDirectory extends adone.fs.Directory {
    unlink() {
        return adone.fs.File.prototype.unlink.call(this);
    }
}
