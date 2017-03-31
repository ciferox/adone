const { math: { Long: ALong } } = adone;

export default class Timestamp extends ALong {
    constructor(low, high) {
        super(low, high);
        this._bsontype = "Timestamp";
    }
}

Timestamp.MIN_VALUE = Timestamp.fromBits(0, 0x80000000 | 0, false);  // Minimum signed value
Timestamp.MAX_VALUE = Timestamp.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0, false);  // Maximum signed value
Timestamp.MAX_UNSIGNED_VALUE = Timestamp.fromBits(0xFFFFFFFF | 0, 0xFFFFFFFF | 0, true);  // Maximum unsigned value

Timestamp.ZERO = Timestamp.fromInt(0);  // Signed zero
Timestamp.UZERO = Timestamp.fromInt(0, true);  // Unsigned zero
Timestamp.ONE = Timestamp.fromInt(1);  // Signed one
Timestamp.UONE = Timestamp.fromInt(1, true);  // Unsigned one
Timestamp.NEG_ONE = Timestamp.fromInt(-1);  // Signed negative one
