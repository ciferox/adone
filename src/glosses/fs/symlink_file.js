const { std: { fs: sfs }, fs } = adone;

export default class SymbolicLinkFile extends fs.File {
    realpath() {
        return fs.realpath(this.path());
    }

    async content(encoding = "utf8") {
        return fs.readFile(await this.realpath(), { encoding });
    }

    async contentSync(encoding = "utf8") {
        return fs.readFile(await this.realpath(), { encoding });
    }

    async contentStream(encoding = "utf8") {
        return sfs.createReadStream(await this.realpath(), { encoding });
    }
}
