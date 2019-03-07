const WantlistEntry = require('../wantlist').Entry

const {
    assertion: { assert },
    multiformat: { CID }
} = adone;

module.exports = class BitswapMessageEntry {
    constructor(cid, priority, cancel) {
        assert(CID.isCID(cid), 'needs valid cid')
        this.entry = new WantlistEntry(cid, priority)
        this.cancel = Boolean(cancel)
    }

    get cid() {
        return this.entry.cid
    }

    set cid(cid) {
        this.entry.cid = cid
    }

    get priority() {
        return this.entry.priority
    }

    set priority(val) {
        this.entry.priority = val
    }

    get [Symbol.toStringTag]() {
        const cidStr = this.cid.toBaseEncodedString()

        return `BitswapMessageEntry ${cidStr} <cancel: ${this.cancel}, priority: ${this.priority}>`
    }

    equals(other) {
        return (this.cancel === other.cancel) &&
            this.entry.equals(other.entry)
    }
}
