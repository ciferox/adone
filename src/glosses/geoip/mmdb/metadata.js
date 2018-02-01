const {
    exception,
    geoip: { mmdb: { __: { Decoder } } }
} = adone;

const METADATA_START_MARKER = Buffer.from("ABCDEF4D61784D696E642E636F6D", "hex");
const VALID_RECORD_SIZES = new Set([24, 28, 32]);

export default class Metadata {
    constructor(db) {
        const offset = this.findStart(db);
        const decoder = new Decoder(db, offset);
        const metadata = decoder.decode(offset).value;

        if (!metadata) {
            throw new exception.InvalidArgument("Cannot parse binary database");
        }

        this.binaryFormatMajorVersion = metadata.binary_format_major_version;
        this.binaryFormatMinorVersion = metadata.binary_format_minor_version;
        this.buildEpoch = new Date(metadata.build_epoch * 1000);
        this.databaseType = metadata.database_type;
        this.languages = metadata.languages;
        this.description = metadata.description;
        this.ipVersion = metadata.ip_version;
        this.nodeCount = metadata.node_count;

        this.recordSize = metadata.record_size;

        if (!VALID_RECORD_SIZES.has(this.recordSize)) {
            throw new exception.NotSupported("Unsupported record size");
        }

        this.nodeByteSize = this.recordSize / 4;
        this.searchTreeSize = this.nodeCount * this.nodeByteSize;

        // Depth depends on the IP version, it's 32 for IPv4 and 128 for IPv6.
        this.treeDepth = Math.pow(2, this.ipVersion + 1);
    }

    findStart(db) {
        const mlen = METADATA_START_MARKER.length - 1;
        let found = 0;
        let fsize = db.length - 1;

        while (found <= mlen && fsize-- > 0) {
            found += (db[fsize] === METADATA_START_MARKER[mlen - found]) ? 1 : -found;
        }
        return fsize + found;
    }
}
