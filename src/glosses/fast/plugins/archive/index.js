export default function plugin() {
    return function archive(type, packerOptions = {}) {
        switch (type) {
            case "tar.gz":
                return this.pack("tar", packerOptions).compress("gz", {
                    rename: false
                });
            case "tar.xz":
                return this.pack("tar", packerOptions).compress("xz", {
                    rename: false
                });
            case "zip":
                return this.pack(type, packerOptions);
            default:
                throw new adone.error.UnknownException(`Unknown archive type: ${type}`);
        }        
    };
}
