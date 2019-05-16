const {
    is,
    math: { BigInteger },
    net: { ip },
    lodash: { repeat, padStart }
} = adone;

const constants4 = {
    BITS: 32,
    GROUPS: 4,
    RE_ADDRESS: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/g,
    RE_SUBNET_STRING: /\/\d{1,2}$/
};


/**
 * Represents an IPv4 address
 * @class IP4
 * @param {string} address - An IPv4 address string
 */
export default class IP4 {
    constructor(address) {
        this.valid = false;
        this.address = address;
        this.groups = constants4.GROUPS;

        this.v4 = true;

        this.subnet = "/32";
        this.subnetMask = 32;

        const subnet = constants4.RE_SUBNET_STRING.exec(address);

        if (subnet) {
            this.parsedSubnet = subnet[0].replace("/", "");
            this.subnetMask = parseInt(this.parsedSubnet, 10);
            this.subnet = `/${this.subnetMask}`;

            if (this.subnetMask < 0 || this.subnetMask > constants4.BITS) {
                this.valid = false;
                this.error = "Invalid subnet mask.";

                return;
            }

            address = address.replace(constants4.RE_SUBNET_STRING, "");
        }

        this.addressMinusSuffix = address;

        this.parsedAddress = this.parse(address);
    }

    equal(other) {
        if (!(other instanceof IP4)) {
            return false;
        }
        if (this.subnetMask !== other.subnetMask) {
            return false;
        }
        for (let i = 0; i < 4; ++i) {
            if (this.parsedAddress[i] !== other.parsedAddress[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Parses a v4 address
     */
    parse(address) {
        const groups = address.split(".");

        if (address.match(constants4.RE_ADDRESS)) {
            this.valid = true;
        } else {
            this.error = "Invalid IPv4 address.";
        }

        return groups;
    }

    /**
     * Return true if the address is valid
     * @memberof IP4
     * @instance
     * @returns {Boolean}
     */
    isValid() {
        return this.valid;
    }

    /**
     * Returns the correct form of an address
     * @memberof IP4
     * @instance
     * @returns {String}
     */
    correctForm() {
        return this.parsedAddress.map((part) => {
            return parseInt(part, 10);
        }).join(".");
    }

    /**
     * Converts an IPv4 address object to a hex string
     * @memberof IP4
     * @instance
     * @returns {String}
     */
    toHex() {
        return this.parsedAddress.map((part) => {
            return adone.sprintf("%02x", parseInt(part, 10));
        }).join(":");
    }

    /**
     * Converts an IPv4 address object to an array of bytes
     * @memberof IP4
     * @instance
     * @returns {Array}
     */
    toArray() {
        return this.parsedAddress.map((part) => {
            return parseInt(part, 10);
        });
    }

    /**
     * Converts an IPv4 address object to an IPv6 address group
     * @memberof IP4
     * @instance
     * @returns {String}
     */
    toGroup6() {
        const output = [];

        for (let i = 0; i < constants4.GROUPS; i += 2) {
            const hex = adone.sprintf("%02x%02x", parseInt(this.parsedAddress[i], 10), parseInt(this.parsedAddress[i + 1], 10));

            output.push(adone.sprintf("%x", parseInt(hex, 16)));
        }

        return output.join(":");
    }

    /**
     * Returns the address as a BigInteger
     * @memberof IP4
     * @instance
     * @returns {BigInteger}
     */
    toBigNumber() {
        if (!this.valid) {
            return null;
        }

        return BigInteger(this.parsedAddress.map((n) => {
            return adone.sprintf("%02x", parseInt(n, 10));
        }).join(""), 16);
    }

    toBitSet() {
        if (!this.valid) {
            return null;
        }
        const bitset = new adone.math.BitSet(32);
        for (let i = 0; i < 4; ++i) {
            bitset.writeUInt(Number(this.parsedAddress[i]), 8, 24 - 8 * i);
        }
        return bitset;
    }

    /**
     * Helper function getting start address.
     * @memberof IP4
     * @instance
     * @returns {BigInteger}
     */
    _startAddress() {
        return BigInteger(this.mask() + repeat(0, constants4.BITS - this.subnetMask), 2);
    }

    /**
     * The first address in the range given by this address' subnet.
     * Often referred to as the Network Address.
     * @memberof IP4
     * @instance
     * @returns {IP4}
     */
    startAddress() {
        return IP4.fromBigInteger(this._startAddress());
    }

    /**
     * The first host address in the range given by this address's subnet ie
     * the first address after the Network Address
     * @memberof IP4
     * @instance
     * @returns {IP4}
     */
    startAddressExclusive() {
        const adjust = BigInteger("1");
        return IP4.fromBigInteger(this._startAddress().plus(adjust));
    }

    /**
     * Helper function getting end address.
     * @memberof IP4
     * @instance
     * @returns {BigInteger}
     */
    _endAddress() {
        return BigInteger(this.mask() + repeat(1, constants4.BITS - this.subnetMask), 2);
    }

    /**
     * The last address in the range given by this address' subnet
     * Often referred to as the Broadcast
     * @memberof IP4
     * @instance
     * @returns {IP4}
     */
    endAddress() {
        return IP4.fromBigInteger(this._endAddress());
    }

    /**
     * The last host address in the range given by this address's subnet ie
     * the last address prior to the Broadcast Address
     * @memberof IP4
     * @instance
     * @returns {IP4}
     */
    endAddressExclusive() {
        const adjust = BigInteger("1");
        return IP4.fromBigInteger(this._endAddress().subtract(adjust));
    }

    /**
     * Returns the first n bits of the address, defaulting to the
     * subnet mask
     * @memberof IP4
     * @instance
     * @returns {String}
     */
    mask(optionalMask) {
        if (is.undefined(optionalMask)) {
            optionalMask = this.subnetMask;
        }

        return this.getBitsBase2(0, optionalMask);
    }

    /**
     * Returns the bits in the given range as a base-2 string
     * @memberof IP4
     * @instance
     * @returns {string}
     */
    getBitsBase2(start, end) {
        return this.binaryZeroPad().slice(start, end);
    }

    /**
     * Returns a zero-padded base-2 string representation of the address
     * @memberof IP4
     * @instance
     * @returns {string}
     */
    binaryZeroPad() {
        return padStart(this.toBigNumber().toString(2), constants4.BITS, "0");
    }

    *[Symbol.iterator]() {
        // TODO: optimize
        const start = this.startAddress().toBigNumber();
        const end = this.endAddress().toBigNumber();
        for (let i = start; end.greaterOrEquals(i); i = i.plus(1)) {
            yield IP4.fromBigInteger(i);
        }
    }

    /**
     * Converts a hex string to an IPv4 address object
     * @memberof IP4
     * @static
     * @param {string} hex - a hex string to convert
     * @returns {IP4}
     */
    static fromHex(hex) {
        const padded = padStart(hex.replace(/:/g, ""), 8, "0");
        const groups = [];

        for (let i = 0; i < 8; i += 2) {
            const h = padded.slice(i, i + 2);

            groups.push(parseInt(h, 16));
        }

        return new IP4(groups.join("."));
    }

    /**
     * Converts an integer into a IPv4 address object
     * @memberof IP4
     * @static
     * @param {integer} integer - a number to convert
     * @returns {IP4}
     */
    static fromInteger(integer) {
        return IP4.fromHex(integer.toString(16));
    }

    /**
     * Converts a BigInteger to a v4 address object
     * @memberof IP4
     * @static
     * @param {BigInteger} bigNumber - a BigInteger to convert
     * @returns {IP4}
     */
    static fromBigInteger(bigNumber) {
        return IP4.fromInteger(parseInt(bigNumber.toString(), 10));
    }

    static fromBitSet(bitset, subnet = 32) {
        const groups = [];
        for (let i = 0; i < 4; ++i) {
            groups.push(bitset.readUInt(8, 24 - 8 * i));
        }
        return new IP4(`${groups.join(".")}/${subnet}`);
    }
}

/**
 * Returns true if the address is correct, false otherwise
 * @memberof IP4
 * @instance
 * @returns {Boolean}
 */
IP4.prototype.isCorrect = ip.isCorrect(constants4.BITS);

/**
 * Returns true if the given address is in the subnet of the current address
 * @memberof IP4
 * @instance
 * @returns {boolean}
 */
IP4.prototype.isInSubnet = ip.isInSubnet;

IP4.constants = constants4;
