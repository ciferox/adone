const { std: { net } } = adone;

export const concat2 = (a, b) => (a << 8) | b;

export const concat3 = (a, b, c) => (a << 16) | (b << 8) | c;

export const concat4 = (a, b, c, d) => (a << 24) | (b << 16) | (c << 8) | d;

export const ip = {
    parseIPv4: (ip) => {
        ip = ip.split(".", 4);

        return [
            parseInt(ip[0]),
            parseInt(ip[1]),
            parseInt(ip[2]),
            parseInt(ip[3])
        ];
    },
    parseIPv6: (ip) => {
        const addr = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let i;
        let parsed;
        let chunk;

        const hex = function (v) {
            v = parseInt(v, 10).toString(16);
            return (v.length === 2) ? v : `0${v}`;
        };

        // ipv4 e.g. `::ffff:64.17.254.216`
        if (ip.indexOf(".") > -1) {
            ip = ip.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, (match, a, b, c, d) => {
                return `${hex(a) + hex(b)}:${hex(c)}${hex(d)}`;
            });
        }

        const [left, right] = ip.split("::", 2);

        if (left) {
            parsed = left.split(":");
            for (i = 0; i < parsed.length; i++) {
                chunk = parseInt(parsed[i], 16);
                addr[i * 2] = chunk >> 8;
                addr[i * 2 + 1] = chunk & 0xff;
            }
        }


        if (right) {
            parsed = right.split(":");
            const offset = 16 - (parsed.length * 2); // 2 bytes per chunk
            for (i = 0; i < parsed.length; i++) {
                chunk = parseInt(parsed[i], 16);
                addr[offset + (i * 2)] = chunk >> 8;
                addr[offset + (i * 2 + 1)] = chunk & 0xff;
            }
        }

        return addr;
    },
    parse: (addr) => addr.includes(":") ? ip.parseIPv6(addr) : ip.parseIPv4(addr),
    bitAt: (rawAddress, idx) => {
        // 8 bits per octet in the buffer (>>3 is slightly faster than Math.floor(idx/8))
        const bufIdx = idx >> 3;

        // Offset within the octet (basicallg equivalent to 8  - (idx % 8))
        const bitIdx = 7 ^ (idx & 7);

        // Shift the offset rightwards by bitIdx bits and & it to grab the bit
        return (rawAddress[bufIdx] >>> bitIdx) & 1;
    },
    validate: (ip) => {
        const v = net.isIP(ip);
        return v === 4 || v === 6;
    }
};
