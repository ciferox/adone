const { math: { Long } } = adone;

const ONE_LONG = new Long(1, 0, true);
const ZERO = 0 >>> 0;
const ONE = 1 >>> 0;

export default class LongUid {
    constructor() {
        this.id = new Long(0, 0, true);
    }

    create() {
        if (this.id.equals(Long.MAX_UNSIGNED_VALUE)) {
            this.id.low = ONE;
            this.id.high = ZERO;
        } else {
            this.id = this.id.add(ONE_LONG);
        }
        return this.id;
    }

    compare(id1, id2) {
        return id1.equals(id2);
    }

    toString(id) {
        return id.toString();
    }
}
