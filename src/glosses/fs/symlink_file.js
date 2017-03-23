const { std: { fs: sfs }, fs } = adone;

export default class SymbolicLinkFile extends fs.File {
    realpath() {
        return sfs.realpathAsync(this.path());
    }

    async content(encoding = "utf8") {
        return sfs.readFileAsync(await this.realpath(), encoding);
    }

    async contentSync(encoding = "utf8") {
        return sfs.readFileSync(await this.realpath(), encoding);
    }

    async contentStream(encoding = "utf8") {
        return sfs.createReadStream(await this.realpath(), { encoding });
    }
}
