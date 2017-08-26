const { std: { fs: sfs }, fs } = adone;

export default class SymbolicLinkFile extends fs.File {
    realpath() {
        return fs.realpath(this.path());
    }

    async contents(encoding = this._encoding) {
        encoding = this._handleEncoding(encoding);
        return fs.readFile(await this.realpath(), { encoding });
    }

    async contentsSync(encoding = this._encoding) {
        encoding = this._handleEncoding(encoding);
        return fs.readFile(await this.realpath(), { encoding });
    }

    async contentsStream(encoding = this._encoding) {
        encoding = this._handleEncoding(encoding);
        return sfs.createReadStream(await this.realpath(), { encoding });
    }
}
