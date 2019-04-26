export default (fs) => {
    return class SymbolicLinkDirectory extends fs.Directory {
        realpath() {
            return fs.realpath(this.path());
        }

        unlink() {
            return fs.File.prototype.unlink.call(this);
        }
    }
}