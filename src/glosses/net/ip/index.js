// A wrapper function that returns false if the address is not valid; used to avoid boilerplate checks for `if (!this.valid) { return false; }`
export const falseIfInvalid = function (fn) {
    return function (...args) {
        if (!this.valid) {
            return false;
        }

        return fn.apply(this, args);
    };
};

export const isInSubnet = falseIfInvalid(function (address) {
    if (this.subnetMask < address.subnetMask) {
        return false;
    }

    if (this.mask(address.subnetMask) === address.mask()) {
        return true;
    }

    return false;
});

export const isCorrect = function (defaultBits) {
    return falseIfInvalid(function () {
        if (this.addressMinusSuffix !== this.correctForm()) {
            return false;
        }

        if (this.subnetMask === defaultBits && !this.parsedSubnet) {
            return true;
        }

        return this.parsedSubnet === String(this.subnetMask);
    });
};

const ipv4Regex = /^(\d{1,3}\.){3,3}\d{1,3}$/;
const ipv6Regex = /^(::)?(((\d{1,3}\.){3}(\d{1,3}){1})?([0-9a-f]){0,4}:{0,2}){1,8}(::)?$/i;

export const isV4Format = (ip) => ipv4Regex.test(ip);

export const isV6Format = function (ip) {
    return ipv6Regex.test(ip);
};


export const toBuffer = function (ip, buff, offset) {
    offset = ~~offset;

    let result;

    if (isV4Format(ip)) {
        result = buff || Buffer.alloc(offset + 4);
        ip.split(/\./g).map((byte) => {
            result[offset++] = parseInt(byte, 10) & 0xff;
        });
    } else if (isV6Format(ip)) {
        const sections = ip.split(":", 8);

        let i;
        for (i = 0; i < sections.length; i++) {
            const isv4 = isV4Format(sections[i]);
            let v4Buffer;

            if (isv4) {
                v4Buffer = toBuffer(sections[i]);
                sections[i] = v4Buffer.slice(0, 2).toString("hex");
            }

            if (v4Buffer && ++i < 8) {
                sections.splice(i, 0, v4Buffer.slice(2, 4).toString("hex"));
            }
        }

        if (sections[0] === "") {
            while (sections.length < 8) {
                sections.unshift("0");
            }
        } else if (sections[sections.length - 1] === "") {
            while (sections.length < 8) {
                sections.push("0");
            }
        } else if (sections.length < 8) {
            for (i = 0; i < sections.length && sections[i] !== ""; i++) {
                //
            }
            const argv = [i, 1];
            for (i = 9 - sections.length; i > 0; i--) {
                argv.push("0");
            }
            sections.splice.apply(sections, argv);
        }

        result = buff || Buffer.alloc(offset + 16);
        for (i = 0; i < sections.length; i++) {
            const word = parseInt(sections[i], 16);
            result[offset++] = (word >> 8) & 0xff;
            result[offset++] = word & 0xff;
        }
    }

    if (!result) {
        throw Error(`Invalid ip address: ${ip}`);
    }

    return result;
};

export const toString = function (buff, offset, length) {
    offset = ~~offset;
    length = length || (buff.length - offset);

    let result = [];
    if (length === 4) {
        // IPv4
        for (let i = 0; i < length; i++) {
            result.push(buff[offset + i]);
        }
        result = result.join(".");
    } else if (length === 16) {
        // IPv6
        for (let i = 0; i < length; i += 2) {
            result.push(buff.readUInt16BE(offset + i).toString(16));
        }
        result = result.join(":");
        result = result.replace(/(^|:)0(:0)*:0(:|$)/, "$1::$3");
        result = result.replace(/:{3,4}/, "::");
    }

    return result;
};

const _normalizeFamily = (family) => family ? family.toLowerCase() : "ipv4";

export const fromPrefixLen = function (prefixlen, family) {
    if (prefixlen > 32) {
        family = "ipv6";
    } else {
        family = _normalizeFamily(family);
    }

    let len = 4;
    if (family === "ipv6") {
        len = 16;
    }
    const buff = Buffer.alloc(len);

    for (let i = 0, n = buff.length; i < n; ++i) {
        let bits = 8;
        if (prefixlen < 8) {
            bits = prefixlen;
        }
        prefixlen -= bits;

        buff[i] = ~(0xff >> bits) & 0xff;
    }

    return toString(buff);
};

export const mask = function (addr, msk) {
    addr = toBuffer(addr);
    msk = toBuffer(msk);

    const result = Buffer.alloc(Math.max(addr.length, msk.length));

    let i = 0;
    // Same protocol - do bitwise and
    if (addr.length === msk.length) {
        for (i = 0; i < addr.length; i++) {
            result[i] = addr[i] & msk[i];
        }
    } else if (msk.length === 4) {
        // IPv6 address and IPv4 msk
        // (Mask low bits)
        for (i = 0; i < msk.length; i++) {
            result[i] = addr[addr.length - 4 + i] & msk[i];
        }
    } else {
        // IPv6 msk and IPv4 addr
        for (i = 0; i < result.length - 6; i++) {
            result[i] = 0;
        }

        // ::ffff:ipv4
        result[10] = 0xff;
        result[11] = 0xff;
        for (i = 0; i < addr.length; i++) {
            result[i + 12] = addr[i] & msk[i + 12];
        }
        i = i + 12;
    }
    for (; i < result.length; i++) {
        result[i] = 0;
    }

    return toString(result);
};

export const cidr = function (cidrString) {
    const cidrParts = cidrString.split("/");

    const addr = cidrParts[0];
    if (cidrParts.length !== 2) {
        throw new Error(`invalid CIDR subnet: ${addr}`);
    }

    const msk = fromPrefixLen(parseInt(cidrParts[1], 10));

    return mask(addr, msk);
};

export const fromLong = function (ipl) {
    return (`${ipl >>> 24}.${
        ipl >> 16 & 255}.${
        ipl >> 8 & 255}.${
        ipl & 255}`);
};

export const toLong = function (ip) {
    let ipl = 0;
    ip.split(".").forEach((octet) => {
        ipl <<= 8;
        ipl += parseInt(octet);
    });
    return (ipl >>> 0);
};

export const subnet = function (addr, msk) {
    const networkAddress = toLong(mask(addr, msk));

    // Calculate the mask's length.
    const maskBuffer = toBuffer(msk);
    let maskLength = 0;

    for (let i = 0; i < maskBuffer.length; i++) {
        if (maskBuffer[i] === 0xff) {
            maskLength += 8;
        } else {
            let octet = maskBuffer[i] & 0xff;
            while (octet) {
                octet = (octet << 1) & 0xff;
                maskLength++;
            }
        }
    }

    const numberOfAddresses = Math.pow(2, 32 - maskLength);

    return {
        networkAddress: fromLong(networkAddress),
        firstAddress: numberOfAddresses <= 2 ?
            fromLong(networkAddress) :
            fromLong(networkAddress + 1),
        lastAddress: numberOfAddresses <= 2 ?
            fromLong(networkAddress + numberOfAddresses - 1) :
            fromLong(networkAddress + numberOfAddresses - 2),
        broadcastAddress: fromLong(networkAddress + numberOfAddresses - 1),
        subnetMask: msk,
        subnetMaskLength: maskLength,
        numHosts: numberOfAddresses <= 2 ?
            numberOfAddresses : numberOfAddresses - 2,
        length: numberOfAddresses,
        contains(other) {
            return networkAddress === toLong(mask(other, msk));
        }
    };
};

export const cidrSubnet = function (cidrString) {
    const cidrParts = cidrString.split("/");

    const addr = cidrParts[0];
    if (cidrParts.length !== 2) {
        throw new Error(`invalid CIDR subnet: ${addr}`);
    }

    const msk = fromPrefixLen(parseInt(cidrParts[1], 10));

    return subnet(addr, msk);
};

export const not = function (addr) {
    const buff = toBuffer(addr);
    for (let i = 0; i < buff.length; i++) {
        buff[i] = 0xff ^ buff[i];
    }
    return toString(buff);
};

export const or = function (a, b) {
    a = toBuffer(a);
    b = toBuffer(b);

    // same protocol
    if (a.length === b.length) {
        for (let i = 0; i < a.length; ++i) {
            a[i] |= b[i];
        }
        return toString(a);

        // mixed protocols
    }
    let buff = a;
    let other = b;
    if (b.length > a.length) {
        buff = b;
        other = a;
    }

    const offset = buff.length - other.length;
    for (let i = offset; i < buff.length; ++i) {
        buff[i] |= other[i - offset];
    }

    return toString(buff);

};

export const isEqual = function (a, b) {
    a = toBuffer(a);
    b = toBuffer(b);

    // Same protocol
    if (a.length === b.length) {
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }

    // Swap
    if (b.length === 4) {
        const t = b;
        b = a;
        a = t;
    }

    // a - IPv4, b - IPv6
    for (let i = 0; i < 10; i++) {
        if (b[i] !== 0) {
            return false;
        }
    }

    const word = b.readUInt16BE(10);
    if (word !== 0 && word !== 0xffff) {
        return false;
    }

    for (let i = 0; i < 4; i++) {
        if (a[i] !== b[i + 12]) {
            return false;
        }
    }

    return true;
};

export const isPrivate = function (addr) {
    return /^(::f{4}:)?10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i
        .test(addr) ||
        /^(::f{4}:)?192\.168\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
        /^(::f{4}:)?172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})$/i
            .test(addr) ||
        /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
        /^(::f{4}:)?169\.254\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
        /^f[cd][0-9a-f]{2}:/i.test(addr) ||
        /^fe80:/i.test(addr) ||
        /^::1$/.test(addr) ||
        /^::$/.test(addr);
};

export const isPublic = (addr) => !isPrivate(addr);

export const isLoopback = function (addr) {
    return /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/
        .test(addr) ||
        /^fe80::1$/.test(addr) ||
        /^::1$/.test(addr) ||
        /^::$/.test(addr);
};

export const loopback = function (family) {
    //
    // Default to `ipv4`
    //
    family = _normalizeFamily(family);

    if (family !== "ipv4" && family !== "ipv6") {
        throw new Error("family must be ipv4 or ipv6");
    }

    return family === "ipv4" ? "127.0.0.1" : "fe80::1";
};

//
// ### function address (name, family)
// #### @name {string|'public'|'private'} **Optional** Name or security
//      of the network interface.
// #### @family {ipv4|ipv6} **Optional** IP family of the address (defaults
//      to ipv4).
//
// Returns the address for the network interface on the current system with
// the specified `name`:
//   * String: First `family` address of the interface.
//             If not found see `undefined`.
//   * 'public': the first public ip address of family.
//   * 'private': the first private ip address of family.
//   * undefined: First address with `ipv4` or loopback address `127.0.0.1`.
//
export const address = function (name, family) {
    const interfaces = adone.std.os.networkInterfaces();

    //
    // Default to `ipv4`
    //
    family = _normalizeFamily(family);

    //
    // If a specific network interface has been named,
    // return the address.
    //
    if (name && name !== "private" && name !== "public") {
        const res = interfaces[name].filter((details) => {
            const itemFamily = details.family.toLowerCase();
            return itemFamily === family;
        });
        if (res.length === 0) {
            return undefined;
        }
        return res[0].address;
    }

    const all = Object.keys(interfaces).map((nic) => {
        //
        // Note: name will only be `public` or `private`
        // when this is called.
        //
        const addresses = interfaces[nic].filter((details) => {
            details.family = details.family.toLowerCase();
            if (details.family !== family || isLoopback(details.address)) {
                return false;
            } else if (!name) {
                return true;
            }

            return name === "public" ? isPrivate(details.address) :
                isPublic(details.address);
        });

        return addresses.length ? addresses[0].address : undefined;
    }).filter(Boolean);

    return !all.length ? loopback(family) : all[0];
};

adone.lazify({
    IP4: "./ip4",
    IP6: "./ip6",
    IPRange: "./ip_range",
    v6helpers: "./v6helpers",
    lookup: () => adone.promise.promisify(adone.std.dns.lookup),
    splitRange: "./split_range"
}, adone.asNamespace(exports), require);
