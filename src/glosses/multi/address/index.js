const {
    data: { base58, varint },
    is,
    vendor: { lodash: { map } }
} = adone;

const __ = adone.lazify({
    codec: "./codec",
    convert: ["./convert", (mod) => mod.convert],
    toBuffer: ["./convert", (mod) => mod.toBuffer],
    toString: ["./convert", (mod) => mod.toString],
    protocols: "./protocols_table"
}, adone.asNamespace(exports), require);

const NotImplemented = new Error("Sorry, Not Implemented Yet.");

/**
 * Creates a [multiaddr](https://github.com/multiformats/multiaddr) from a Buffer, String or another Multiaddr instance
 * public key.
 * @class Multiaddr
 * @param {(String|Buffer|Multiaddr)} addr - If String or Buffer, needs to adhere
 * to the address format of a [multiaddr](https://github.com/multiformats/multiaddr#string-format)
 * @example
 * Multiaddr('/ip4/127.0.0.1/tcp/4001')
 * // <Multiaddr 047f000001060fa1 - /ip4/127.0.0.1/tcp/4001>
 */
export class Multiaddr {
    constructor(addr = "") {
        if (addr instanceof Buffer) {
            /**
             * @type {Buffer} - The raw bytes representing this multiaddress
             */
            this.buffer = __.codec.fromBuffer(addr);
        } else if (is.string(addr) || addr instanceof String) {
            this.buffer = __.codec.fromString(addr);
        } else if (addr.buffer && addr.protos && addr.protoCodes) { // Multiaddr
            this.buffer = __.codec.fromBuffer(addr.buffer); // validate + copy buffer
        } else {
            throw new Error("addr must be a string, Buffer, or another Multiaddr");
        }
    }

    /**
     * Returns Multiaddr as a String
     *
     * @returns {String}
     * @example
     * Multiaddr('/ip4/127.0.0.1/tcp/4001').toString()
     * // '/ip4/127.0.0.1/tcp/4001'
     */
    toString() {
        return __.codec.bufferToString(this.buffer);
    }

    /**
     * Returns Multiaddr as a convinient options object to be used with net.createConnection
     *
     * @returns {{family: String, host: String, transport: String, port: String}}
     * @example
     * Multiaddr('/ip4/127.0.0.1/tcp/4001').toOptions()
     * // { family: 'ipv4', host: '127.0.0.1', transport: 'tcp', port: '4001' }
     */
    toOptions() {
        const opts = {};
        const parsed = this.toString().split("/");
        opts.family = parsed[1] === "ip4" ? "ipv4" : "ipv6";
        opts.host = parsed[2];
        opts.transport = parsed[3];
        opts.port = parsed[4];
        return opts;
    }

    /**
     * Returns Multiaddr as a human-readable string
     *
     * @returns {String}
     * @example
     * Multiaddr('/ip4/127.0.0.1/tcp/4001').inspect()
     * // '<Multiaddr 047f000001060fa1 - /ip4/127.0.0.1/tcp/4001>'
     */
    inspect() {
        return `<Multiaddr ${
            this.buffer.toString("hex")} - ${
            __.codec.bufferToString(this.buffer)}>`;
    }

    /**
     * Returns the protocols the Multiaddr is defined with, as an array of objects, in
     * left-to-right order. Each object contains the protocol code, protocol name,
     * and the size of its address space in bits.
     * [See list of protocols](https://github.com/multiformats/multiaddr/blob/master/protocols.csv)
     *
     * @returns {Array.<Object>} protocols - All the protocols the address is composed of
     * @returns {Number} protocols[].code
     * @returns {Number} protocols[].size
     * @returns {String} protocols[].name
     * @example
     * Multiaddr('/ip4/127.0.0.1/tcp/4001').protos()
     * // [ { code: 4, size: 32, name: 'ip4' },
     * //   { code: 6, size: 16, name: 'tcp' } ]
     */
    protos() {
        return map(this.protoCodes(), (code) => {
            return Object.assign({}, __.protocols(code));
            // copy to prevent users from modifying the internal objs.
        });
    }

    /**
     * Returns the codes of the protocols in left-to-right order.
     * [See list of protocols](https://github.com/multiformats/multiaddr/blob/master/protocols.csv)
     *
     * @returns {Array.<Number>} protocol codes
     * @example
     * Multiaddr('/ip4/127.0.0.1/tcp/4001').protoCodes()
     * // [ 4, 6 ]
     */
    protoCodes() {
        const codes = [];
        const buf = this.buffer;
        let i = 0;
        while (i < buf.length) {
            const code = varint.decode(buf, i);
            const n = varint.decode.bytes;

            const p = __.protocols(code);
            const size = __.codec.sizeForAddr(p, buf.slice(i + n));

            i += (size + n);
            codes.push(code);
        }

        return codes;
    }

    /**
     * Returns the names of the protocols in left-to-right order.
     * [See list of protocols](https://github.com/multiformats/multiaddr/blob/master/protocols.csv)
     *
     * @return {Array.<String>} protocol names
     * @example
     * Multiaddr('/ip4/127.0.0.1/tcp/4001').protoNames()
     * // [ 'ip4', 'tcp' ]
     */
    protoNames() {
        return map(this.protos(), (proto) => {
            return proto.name;
        });
    }

    /**
     * Returns a tuple of parts
     *
     * @return {Array.<Array>} tuples
     * @return {Number} tuples[].0 code of protocol
     * @return {Buffer} tuples[].1 contents of address
     * @example
     * Multiaddr("/ip4/127.0.0.1/tcp/4001").tuples()
     * // [ [ 4, <Buffer 7f 00 00 01> ], [ 6, <Buffer 0f a1> ] ]
     */
    tuples() {
        return __.codec.bufferToTuples(this.buffer);
    }

    /**
     * Returns a tuple of string/number parts
     *
     * @return {Array.<Array>} tuples
     * @return {Number} tuples[].0 code of protocol
     * @return {(String|Number)} tuples[].1 contents of address
     * @example
     * Multiaddr("/ip4/127.0.0.1/tcp/4001").stringTuples()
     * // [ [ 4, '127.0.0.1' ], [ 6, 4001 ] ]
     */
    stringTuples() {
        const t = __.codec.bufferToTuples(this.buffer);
        return __.codec.tuplesToStringTuples(t);
    }

    /**
     * Encapsulates a Multiaddr in another Multiaddr
     *
     * @param {Multiaddr} addr - Multiaddr to add into this Multiaddr
     * @return {Multiaddr}
     * @example
     * const mh1 = Multiaddr('/ip4/8.8.8.8/tcp/1080')
     * // <Multiaddr 0408080808060438 - /ip4/8.8.8.8/tcp/1080>
     *
     * const mh2 = Multiaddr('/ip4/127.0.0.1/tcp/4001')
     * // <Multiaddr 047f000001060fa1 - /ip4/127.0.0.1/tcp/4001>
     *
     * const mh3 = mh1.encapsulate(mh2)
     * // <Multiaddr 0408080808060438047f000001060fa1 - /ip4/8.8.8.8/tcp/1080/ip4/127.0.0.1/tcp/4001>
     *
     * mh3.toString()
     * // '/ip4/8.8.8.8/tcp/1080/ip4/127.0.0.1/tcp/4001'
     */
    encapsulate(addr) {
        addr = new Multiaddr(addr);
        return new Multiaddr(this.toString() + addr.toString());
    }

    /**
     * Decapsulates a Multiaddr from another Multiaddr
     *
     * @param {Multiaddr} addr - Multiaddr to remove from this Multiaddr
     * @return {Multiaddr}
     * @example
     * const mh1 = Multiaddr('/ip4/8.8.8.8/tcp/1080')
     * // <Multiaddr 0408080808060438 - /ip4/8.8.8.8/tcp/1080>
     *
     * const mh2 = Multiaddr('/ip4/127.0.0.1/tcp/4001')
     * // <Multiaddr 047f000001060fa1 - /ip4/127.0.0.1/tcp/4001>
     *
     * const mh3 = mh1.encapsulate(mh2)
     * // <Multiaddr 0408080808060438047f000001060fa1 - /ip4/8.8.8.8/tcp/1080/ip4/127.0.0.1/tcp/4001>
     *
     * mh3.decapsulate(mh2).toString()
     * // '/ip4/8.8.8.8/tcp/1080'
     */
    decapsulate(addr) {
        addr = addr.toString();
        const s = this.toString();
        const i = s.lastIndexOf(addr);
        if (i < 0) {
            throw new Error(`Multiaddr ${this} does not contain subaddress: ${addr}`);
        }
        return new Multiaddr(s.slice(0, i));
    }

    /**
     * Extract the peerId if the multiaddr contains one
     *
     * @return {String|null} peerId - The id of the peer or null if invalid or missing from the ma
     * @example
     * const mh1 = Multiaddr('/ip4/8.8.8.8/tcp/1080/ipfs/QmValidBase58string')
     * // <Multiaddr 0408080808060438 - /ip4/8.8.8.8/tcp/1080/ipfs/QmValidBase58string>
     *
     * // should return QmValidBase58string or null if the id is missing or invalid
     * const peerId = mh1.getPeerId()
     */
    getPeerId() {
        let b58str = null;
        try {
            b58str = this.stringTuples().filter((tuple) => {
                if (tuple[0] === __.protocols.names.ipfs.code) {
                    return true;
                }
            })[0][1];

            base58.decode(b58str);
        } catch (e) {
            b58str = null;
        }

        return b58str;
    }

    /**
     * Checks if two Multiaddrs are the same
     *
     * @param {Multiaddr} addr
     * @return {Bool}
     * @example
     * const mh1 = Multiaddr('/ip4/8.8.8.8/tcp/1080')
     * // <Multiaddr 0408080808060438 - /ip4/8.8.8.8/tcp/1080>
     *
     * const mh2 = Multiaddr('/ip4/127.0.0.1/tcp/4001')
     * // <Multiaddr 047f000001060fa1 - /ip4/127.0.0.1/tcp/4001>
     *
     * mh1.equals(mh1)
     * // true
     *
     * mh1.equals(mh2)
     * // false
     */
    equals(addr) {
        return this.buffer.equals(addr.buffer);
    }

    /**
     * Gets a Multiaddrs node-friendly address object. Note that protocol information
     * is left out: in Node (and most network systems) the protocol is unknowable
     * given only the address.
     *
     * Has to be a ThinWaist Multiaddr, otherwise throws error
     *
     * @returns {{family: String, address: String, port: String}}
     * @throws {Error} Throws error if Multiaddr is not a Thin Waist address
     * @example
     * Multiaddr('/ip4/127.0.0.1/tcp/4001').nodeAddress()
     * // {family: 'IPv4', address: '127.0.0.1', port: '4001'}
     */
    nodeAddress() {
        if (!this.isThinWaistAddress()) {
            throw new Error('Multiaddr must be "thin waist" address for nodeAddress.');
        }

        const codes = this.protoCodes();
        const parts = this.toString().split("/").slice(1);
        return {
            family: (codes[0] === 41) ? "IPv6" : "IPv4",
            address: parts[1], // ip addr
            port: parts[3] // tcp or udp port
        };
    }

    // TODO find a better example, not sure about it's good enough
    /**
     * Returns if a Multiaddr is a Thin Waist address or not.
     *
     * Thin Waist is if a Multiaddr adheres to the standard combination of:
     *
     * `{IPv4, IPv6}/{TCP, UDP}`
     *
     * @param {Multiaddr} [addr] - Defaults to using `this` instance
     * @returns {Boolean} isThinWaistAddress
     * @example
     * const mh1 = Multiaddr('/ip4/127.0.0.1/tcp/4001')
     * // <Multiaddr 047f000001060fa1 - /ip4/127.0.0.1/tcp/4001>
     * const mh2 = Multiaddr('/ip4/192.168.2.1/tcp/5001')
     * // <Multiaddr 04c0a80201061389 - /ip4/192.168.2.1/tcp/5001>
     * const mh3 = mh1.encapsulate(mh2)
     * // <Multiaddr 047f000001060fa104c0a80201061389 - /ip4/127.0.0.1/tcp/4001/ip4/192.168.2.1/tcp/5001>
     * mh1.isThinWaistAddress()
     * // true
     * mh2.isThinWaistAddress()
     * // true
     * mh3.isThinWaistAddress()
     * // false
     */
    isThinWaistAddress(addr) {
        const protos = (addr || this).protos();

        if (protos.length !== 2) {
            return false;
        }

        if (protos[0].code !== 4 && protos[0].code !== 41) {
            return false;
        }
        if (protos[1].code !== 6 && protos[1].code !== 17) {
            return false;
        }
        return true;
    }

    // TODO rename this to something else than "stupid string"
    /**
     * Converts a "stupid string" into a Multiaddr.
     *
     * Stupid string format:
     * ```
     * <proto><IPv>://<IP Addr>[:<proto port>]
     * udp4://1.2.3.4:5678
     * ```
     *
     * @param {String} [str] - String in the "stupid" format
     * @throws {NotImplemented}
     * @returns {undefined}
     * @todo Not Implemented yet
     */
    fromStupidString(str) {
        throw NotImplemented;
    }
}

/**
 * Creates a Multiaddr from a node-friendly address object
 *
 * @param {String} addr
 * @param {String} transport
 * @returns {Multiaddr} multiaddr
 * @throws {Error} Throws error if addr is not truthy
 * @throws {Error} Throws error if transport is not truthy
 * @example
 * Multiaddr.fromNodeAddress({address: '127.0.0.1', port: '4001'}, 'tcp')
 * // <Multiaddr 047f000001060fa1 - /ip4/127.0.0.1/tcp/4001>
 */
export const fromNodeAddress = (addr, transport) => {
    if (!addr) {
        throw new Error("requires node address object");
    }
    if (!transport) {
        throw new Error("requires transport protocol")
        ;
    }
    const ip = (addr.family === "IPv6") ? "ip6" : "ip4";
    return new Multiaddr(`/${[ip, addr.address, transport, addr.port].join("/")}`);
};

/**
 * Returns if something is a Multiaddr or not
 *
 * @param {Multiaddr} addr
 * @return {Bool} isMultiaddr
 * @example
 * Multiaddr.isMultiaddr(Multiaddr('/ip4/127.0.0.1/tcp/4001'))
 * // true
 * Multiaddr.isMultiaddr('/ip4/127.0.0.1/tcp/4001')
 * // false
 */
export const isMultiaddr = (addr) => {
    if (addr.constructor && addr.constructor.name) {
        return addr.constructor.name === "Multiaddr";
    }

    return Boolean(
        addr.fromStupidString &&
        addr.protos
    );
};

/**
 * Returns if something is a Multiaddr that is a name
 *
 * @param {Multiaddr} addr
 * @return {Bool} isName
 */
export const isName = (addr) => {
    if (!isMultiaddr(addr)) {
        return false;
    }

    // if a part of the multiaddr is resolvable, then return true
    return addr.protos().some((proto) => proto.resolvable);
};

/**
 * Returns an array of multiaddrs, by resolving the multiaddr that is a name
 *
 * @param {Multiaddr} addr
 *
 * @param {Function} callback
 * @return {Bool} isName
 */
export const resolve = (addr, callback) => {
    if (!isMultiaddr(addr) || !isName(addr)) {
        return callback(new Error("not a valid name"));
    }

    /*
    * Needs more consideration from spec design:
    *   - what to return
    *   - how to achieve it in the browser?
    */
    return callback(new Error("not implemented yet"));
}

export const create = (addr) => new Multiaddr(addr);
