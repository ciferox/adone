const {
    is,
    math: { BigNumber },
    collection: { ByteArray },
    std: { net }
} = adone;

const datatypes = {
    pointer: 1,
    string: 2,
    double: 3,
    bytes: 4,
    uint16: 5,
    uint32: 6,
    map: 7,
    uint64: 8,
    uint128: 9,
    array: 11,
    dataCacheContainer: 12,
    endMarker: 13,
    boolean: 14,
    float: 15
};

const TREE_DATA_SEPARATOR = Buffer.alloc(16);
const DATA_METADATA_SEPARATOR = Buffer.from("\xab\xcd\xefMaxMind.com", "binary");

const VALUE = Symbol("value");
const TYPE = Symbol("type");

class Node {
    constructor(parent, data = null) {
        this.parent = parent;
        this.left = null;
        this.right = null;
        this.data = data;
    }

    isDataNode() {
        return is.null(this.left) && is.null(this.right) && !is.null(this.data);
    }
}

class Tree {
    constructor(n) {
        this.depth = n;
        this.root = new Node();
    }

    insertSubnet(address, subnet, data) {
        const { depth } = this;
        let node = this.root;
        for (let i = 0; i < subnet; ++i) {
            const bit = address.get(depth - i - 1); // [depth - 1, 0]
            if (node.isDataNode()) {
                // this is a data node, split it
                node.left = new Node(node, node.data);
                node.left.data = node.data;
                node.right = new Node(node, node.data);
                node.right.data = node.data;
                node.data = null;
            }
            const direction = bit ? "right" : "left";
            if (!node[direction]) {
                node[direction] = new Node(node);
            }
            node = node[direction];
        }
        node.data = data;
    }

    // f(root, A, k, min, max, data) {
    //     if (this.depth === k) {
    //         root.data = data;
    //         return;
    //     }

    //     const minSub = A.shiftLeft(this.depth - k);
    //     const maxSub = minSub.or(BigNumber.ONE.shiftLeft(this.depth - k).sub(1));
    //     if (minSub.ge(min) && max.ge(maxSub)) {
    //         root.data = data;
    //         return;
    //     }

    //     const a = A.shiftLeft(1).or(1).shiftLeft(this.depth - k - 1);
    //     if (max.ge(a)) {
    //         if (!root.right) {
    //             root.right = {
    //                 right: null,
    //                 left: null
    //             };
    //         }
    //         this.f(root.right, A.shiftLeft(1).or(1), k + 1, min, max, data);
    //     }

    //     const b = A.shiftLeft(this.depth - k).or(BigNumber.ONE.shiftLeft(this.depth - k - 1).sub(1));
    //     if (b.ge(min)) {
    //         if (!root.left) {
    //             root.left = {
    //                 right: null,
    //                 left: null
    //             };
    //         }
    //         this.f(root.left, A.shiftLeft(1), k + 1, min, max, data);
    //     }
    // }

    // update(start, end, data) {
    //     this.f(this.root, BigNumber.ZERO, 0, new BigNumber(start), new BigNumber(end), data);
    // }
}

export default class Generator {
    constructor(metadata) {
        this.metadata = metadata;
        this.tree = new Tree(metadata.ipVersion === 4 ? 32 : 128);
    }

    genData(data) {
        let payload;
        if (!is.undefined(data[TYPE]) && !is.undefined(data[VALUE])) {
            switch (data[TYPE]) {
                case datatypes.map:
                    payload = this.genMap(data[VALUE]);
                    break;
                case datatypes.array:
                    payload = this.genArray(data[VALUE]);
                    break;
                case datatypes.string:
                    payload = this.genString(data[VALUE]);
                    break;
                case datatypes.uint16:
                    payload = this.genUInt16(data[VALUE]);
                    break;
                case datatypes.uint32:
                    payload = this.genUInt32(data[VALUE]);
                    break;
                case datatypes.uint64:
                    payload = this.genUInt64(data[VALUE]);
                    break;
                case datatypes.double:
                    payload = this.genDouble(data[VALUE]);
                    break;
                case datatypes.bytes:
                    payload = this.genBytes(data[VALUE]);
                    break;
                case datatypes.boolean:
                    payload = this.genBoolean(data[VALUE]);
                    break;
                default:
                    throw new Error("unknown type");
            }
        } else {
            let type;
            if (is.string(data)) {
                type = datatypes.string;
            } else if (is.array(data)) {
                type = datatypes.array;
            } else if (is.buffer(data)) {
                type = datatypes.bytes;
            } else if (is.plainObject(data)) {
                type = datatypes.map;
            } else if (is.number(data)) {
                type = is.integer(data) ? datatypes.uint32 : datatypes.double;
            } else if (is.boolean(data)) {
                type = datatypes.boolean;
            } else {
                throw new Error("unknown data");
            }
            return this.genData({
                [TYPE]: type,
                [VALUE]: data
            });
        }
        const dataType = this.genDataType(payload);
        if (!payload.buf) {
            return dataType;
        }
        return Buffer.concat([dataType, payload.buf]);
    }

    genDataType(data) {
        const buf = new ByteArray();
        const type = datatypes[data.type];
        let cbyte = 0;
        if (type < 8) {
            cbyte = type;
            cbyte <<= 5;
            if (data.length < 29) {
                cbyte |= data.length;
                buf.writeUInt8(cbyte);
            } else {
                if (data.length - 29 <= 255) {
                    cbyte |= 29;
                    buf.writeUInt8(cbyte);
                    buf.writeUInt8(data.length - 29);
                } else if (data.length - 285 <= 255 * 255) {
                    cbyte |= 30;
                    buf.writeUInt8(cbyte);
                    buf.writeUInt16BE(data.length - 285);
                } else if (data.length - 65821 <= 255 * 255 * 255) {
                    cbyte |= 31;
                    buf.writeUInt8(cbyte);
                    const l = data.length - 65821;
                    buf.writeUInt8(l >> 16);
                    buf.writeUInt16BE(l & 0xFFFF);
                }
            }
        } else {
            // extended type
            cbyte = 0;
            if (data.length < 29) {
                cbyte |= data.length;
                buf.writeUInt8(cbyte);
                buf.writeUInt8(type - 7);
            } else {
                if (data.length - 29 <= 255) {
                    cbyte |= 29;
                    buf.writeUInt8(cbyte);
                    buf.writeUInt8(type - 7);
                    buf.writeUInt8(data.length - 29);
                } else if (data.length - 285 <= 255 * 255) {
                    cbyte |= 30;
                    buf.writeUInt8(cbyte);
                    buf.writeUInt8(type - 7);
                    buf.writeUInt16BE(data.length - 285);
                } else if (data.length - 65821 <= 255 * 255 * 255) {
                    cbyte |= 31;
                    buf.writeUInt8(cbyte);
                    buf.writeUInt8(type - 7);
                    const l = data.length - 65821;
                    buf.writeUInt8(l >> 16);
                    buf.writeUInt16BE(l & 0xFFFF);
                }
            }
        }
        return buf.flip().toBuffer();
    }

    genUInt32(int) {
        const buf = Buffer.alloc(4);
        buf.writeUInt32BE(int);
        return {
            buf,
            type: "uint32",
            length: 4
        };
    }

    genUInt16(int) {
        const buf = Buffer.alloc(2);
        buf.writeUInt16BE(int);
        return {
            buf,
            type: "uint16",
            length: 2
        };
    }

    genUInt64(int) {
        const buf = Buffer.alloc(8);
        int = new BigNumber(int);
        buf.writeUInt32BE(int.shiftRight(32));
        buf.writeUInt32BE(int.and(0xFFFFFFFF), 4);
        return {
            buf,
            type: "uint64",
            length: 8
        };
    }

    genBytes(buf) {
        return {
            buf,
            type: "bytes",
            length: buf.length
        };
    }

    genDouble(double) {
        const buf = Buffer.alloc(8);
        buf.writeDoubleBE(double);
        return {
            buf,
            length: 8,
            type: "double"
        };
    }

    genString(str) {
        const buf = Buffer.from(str, "utf-8");
        return {
            buf,
            type: "string",
            length: buf.length
        };
    }

    genBoolean(value) {
        return {
            type: "boolean",
            length: Number(value)
        };
    }

    genArray(array) {
        const buf = new ByteArray();
        for (const i of array) {
            buf.write(this.genData(i));
        }
        return {
            buf: buf.flip().toBuffer(),
            type: "array",
            length: array.length
        };
    }

    genMap(obj) {
        const buf = new ByteArray();
        let length = 0;
        for (const key of Object.keys(obj)) {
            buf.write(this.genData(key));
            buf.write(this.genData(obj[key]));
            ++length;
        }
        return {
            buf: buf.flip().toBuffer(),
            type: "map",
            length
        };
    }

    insertSubnet(address, subnet, data) {
        if (this.metadata.ipVersion === 6 && net.isIPv4(address)) {
            address = `::${address}`;
            subnet += 96;
        }
        const netaddr = this.metadata.ipVersion === 4
            ? new adone.net.ip.IP4(address)
            : new adone.net.ip.IP6(address);
        this.tree.insertSubnet(netaddr.toBitSet(), subnet, data);
    }

    insertRange(startIp, endIp, data) {
        if (net.isIPv4(startIp) && this.metadata.ipVersion === 6) {
            startIp = `::${startIp}`;
        }
        if (net.isIPv4(endIp) && this.metadata.ipVersion === 6) {
            endIp = `::${endIp}`;
        }
        const subnets = adone.net.ip.splitRange(startIp, endIp);
        for (const subnet of subnets) {
            this.tree.insertSubnet(subnet.toBitSet(), subnet.subnetMask, data);
        }
    }

    insertOne(address, data) {
        if (this.metadata.ipVersion === 6 && net.isIPv4(address)) {
            address = `::${address}`;
        }
        this.insertSubnet(address, this.metadata.ipVersion === 4 ? 32 : 128, data);
    }

    generate() {
        const list = [this.tree.root];
        let data = new Set();
        let i = 0;
        while (list.length !== i) {
            const node = list[i];
            if (node.left) {
                if (!node.left.data) {
                    list.push(node.left);
                } else {
                    data.add(node.left.data);
                }
            }
            if (node.right) {
                if (!node.right.data) {
                    list.push(node.right);
                } else {
                    data.add(node.right.data);
                }
            }
            i++;
        }

        data = [...data];

        const numNodes = list.length;

        const dataBuf = new ByteArray();
        const dataRef = [];
        for (const i of data) {
            dataRef.push(dataBuf.offset);
            dataBuf.write(this.genData(i));
        }

        for (const node of list) {
            if (node.left) {
                if ((node.left.left || node.left.right)) {
                    node.leftRef = list.indexOf(node.left);
                } else {
                    node.leftRef = dataRef[data.indexOf(node.left.data)] + numNodes + 16;
                }
            } else {
                node.leftRef = numNodes;
            }
            if (node.right) {
                if (node.right.left || node.right.right) {
                    node.rightRef = list.indexOf(node.right);
                } else {
                    node.rightRef = dataRef[data.indexOf(node.right.data)] + numNodes + 16;
                }
            } else {
                node.rightRef = numNodes;
            }
        }

        const treeBuf = new ByteArray();
        for (const node of list) {
            switch (this.metadata.recordSize) {
                case 24:
                    treeBuf.writeUInt8(node.leftRef >> 16);
                    treeBuf.writeUInt16BE(node.leftRef & 0xFFFF);
                    treeBuf.writeUInt8(node.rightRef >> 16);
                    treeBuf.writeUInt16BE(node.rightRef & 0xFFFF);
                    break;
                case 28:
                    treeBuf.writeUInt8((node.leftRef >> 16) & 0xF);
                    treeBuf.writeUInt16BE(node.leftRef & 0xFFFF);
                    treeBuf.writeUInt8(((node.leftRef >> 24) << 4) | (node.rightRef >> 24));
                    treeBuf.writeUInt8((node.rightRef >> 16) & 0xF);
                    treeBuf.writeUInt16BE(node.rightRef & 0xFFFF);
                    break;
                case 32:
                    treeBuf.writeUInt32BE(node.leftRef);
                    treeBuf.writeUInt32BE(node.rightRef);
                    break;
            }
        }

        const metadataBuf = new ByteArray();

        /* eslint-disable camelcase */
        metadataBuf.write(this.genData({
            node_count: { [TYPE]: datatypes.uint32, [VALUE]: numNodes },
            record_size: { [TYPE]: datatypes.uint16, [VALUE]: this.metadata.recordSize },
            ip_version: { [TYPE]: datatypes.uint16, [VALUE]: this.metadata.ipVersion },
            database_type: this.metadata.databaseType,
            languages: this.metadata.languages,
            binary_format_major_version: { [TYPE]: datatypes.uint16, [VALUE]: this.metadata.majorVersion },
            binary_format_minor_version: { [TYPE]: datatypes.uint16, [VALUE]: this.metadata.minorVersion },
            build_epoch: { [TYPE]: datatypes.uint64, [VALUE]: this.metadata.buildEpoch || Math.floor(new Date().getTime() / 1000) },
            description: this.metadata.description || "GeoIP database"
        }));
        /* eslint-enable */

        return Buffer.concat([
            treeBuf.flip().toBuffer(),
            TREE_DATA_SEPARATOR,
            dataBuf.flip().toBuffer(),
            DATA_METADATA_SEPARATOR,
            metadataBuf.flip().toBuffer()
        ]);
    }
}
