const {
    is,
    datastore: { Key }
} = adone;

export const readme = `This is a repository of IPLD objects. Each IPLD object is in a single file,
named <base32 encoding of cid>.data. Where <base32 encoding of cid> is the
"base32" encoding of the CID (as specified in
https://github.com/multiformats/multibase) without the 'B' prefix.
All the object files are placed in a tree of directories, based on a
function of the CID. This is a form of sharding similar to
the objects directory in git repositories. Previously, we used
prefixes, we now use the next-to-last two charters.
    func NextToLast(base32cid string) {
      nextToLastLen := 2
      offset := len(base32cid) - nextToLastLen - 1
      return str[offset : offset+nextToLastLen]
    }
For example, an object with a base58 CIDv1 of
    zb2rhYSxw4ZjuzgCnWSt19Q94ERaeFhu9uSqRgjSdx9bsgM6f
has a base32 CIDv1 of
    BAFKREIA22FLID5AJ2KU7URG47MDLROZIH6YF2KALU2PWEFPVI37YLKRSCA
and will be placed at
    SC/AFKREIA22FLID5AJ2KU7URG47MDLROZIH6YF2KALU2PWEFPVI37YLKRSCA.data
with 'SC' being the last-to-next two characters and the 'B' at the
beginning of the CIDv1 string is the multibase prefix that is not
stored in the filename.
`;

export const PREFIX = "/repo/flatfs/shard/";
export const SHARDING_FN = "SHARDING";
export const README_FN = "_README";

class Shard {
    /* :: name: string */
    /* :: param: number */
    /* :: _padding: string */

    constructor(param /* : number */) {
        this.param = param;
    }

    fun(str /* : string */) /* : string */ {
        throw new Error("implement me");
    }

    toString() /* : string */ {
        return `${PREFIX}v1/${this.name}/${this.param}`;
    }
}

export class Prefix extends Shard {
    constructor(prefixLen /* : number */) {
        super(prefixLen);
        this._padding = "".padStart(prefixLen, "_");
        this.name = "prefix";
    }

    fun(noslash /* : string */) /* : string */ {
        return (noslash + this._padding).slice(0, this.param);
    }
}

export class Suffix extends Shard {
    constructor(suffixLen /* : number */) {
        super(suffixLen);
        this._padding = "".padStart(suffixLen, "_");
        this.name = "suffix";
    }

    fun(noslash /* : string */) /* : string */ {
        const s = this._padding + noslash;
        return s.slice(s.length - this.param);
    }
}

export class NextToLast extends Shard {
    constructor(suffixLen /* : number */) {
        super(suffixLen);
        this._padding = "".padStart(suffixLen + 1, "_");
        this.name = "next-to-last";
    }

    fun(noslash /* : string */) /* : string */ {
        const s = this._padding + noslash;
        const offset = s.length - this.param - 1;
        return s.slice(offset, offset + this.param);
    }
}

/**
 * Convert a given string to the matching sharding function.
 *
 * @param {string} str
 * @returns {ShardV1}
 */
export const parseShardFun = (str /* : string */) /* : ShardV1 */ => {
    str = str.trim();

    if (str.length === 0) {
        throw new Error("empty shard string");
    }

    if (!str.startsWith(PREFIX)) {
        throw new Error(`invalid or no path prefix: ${str}`);
    }

    const parts = str.slice(PREFIX.length).split("/");
    const version = parts[0];

    if (version !== "v1") {
        throw new Error(`expect 'v1' version, got '${version}'`);
    }

    const name = parts[1];

    if (!parts[2]) {
        throw new Error("missing param");
    }

    const param = parseInt(parts[2], 10);

    switch (name) {
        case "prefix":
            return new Prefix(param);
        case "suffix":
            return new Suffix(param);
        case "next-to-last":
            return new NextToLast(param);
        default:
            throw new Error(`unkown sharding function: ${name}`);
    }
};

export const readShardFun = (path /* : string */, store /* : Datastore<Buffer> */, callback /* : Callback<ShardV1> */) /* : void */ => {
    const key = new Key(path).child(new Key(SHARDING_FN));
    const get = is.function(store.getRaw) ? store.getRaw.bind(store) : store.get.bind(store);

    get(key, (err, res) => {
        if (err) {
            return callback(err);
        }

        let shard;
        try {
            shard = parseShardFun((res || "").toString().trim());
        } catch (err) {
            return callback(err);
        }

        callback(null, shard);
    });
};
