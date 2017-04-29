const { math: { Long: ALong } } = adone;

export default class Long extends ALong {
    constructor(low, high) {
        super(low, high);
        this._bsontype = "Long";
    }
}

Long.MIN_VALUE = Long.fromBits(0, 0x80000000 | 0, false);  // Minimum signed value
Long.MAX_VALUE = Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0, false);  // Maximum signed value
Long.MAX_UNSIGNED_VALUE = Long.fromBits(0xFFFFFFFF | 0, 0xFFFFFFFF | 0, true);  // Maximum unsigned value

Long.ZERO = Long.fromInt(0);  // Signed zero
Long.UZERO = Long.fromInt(0, true);  // Unsigned zero
Long.ONE = Long.fromInt(1);  // Signed one
Long.UONE = Long.fromInt(1, true);  // Unsigned one
Long.NEG_ONE = Long.fromInt(-1);  // Signed negative one
