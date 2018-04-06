const {
    is,
    std,
    error,
    net: { ip }
} = adone;

export default class IPRange {
    constructor(start, end) {
        if (is.string(start) && is.string(end)) {
            const t = std.net.isIP(start);
            if (!t) {
                throw new error.InvalidArgument("Invalid start address");
            }
            if (std.net.isIP(end) !== t) {
                throw new error.InvalidArgument("Invalid end address");
            }
            this.type = t;
            if (t === 4) {
                start = new ip.IP4(start);
                end = new ip.IP4(end);
            } else {
                start = new ip.IP6(start);
                end = new ip.IP6(end);
            }
        } else if (start instanceof ip.IP4 && end instanceof ip.IP4) {
            this.type = 4;
        } else if (start instanceof ip.IP4 && end instanceof ip.IP6) {
            this.type = 6;
        }
        if (!start.valid) {
            throw new error.InvalidArgument(`Invalid start address: ${start.error}`);
        }
        if (!end.valid) {
            throw new error.InvalidArgument(`Invalid end address: ${end.error}`);
        }
        this.ranges = ip.splitRange(start, end);
    }

    sort() {
        this.ranges = this.ranges.sort((a, b) => {
            return a.startAddress().toBigNumber().cmp(b.startAddress().toBigNumber());
        });
        return this;
    }

    *[Symbol.iterator]() {
        for (const range of this.ranges) {
            yield* range;
        }
    }
}
