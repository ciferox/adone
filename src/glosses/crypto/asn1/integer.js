const {
    crypto: { asn1 }
} = adone;

const {
    BaseBlock
} = asn1;

const __ = adone.private(asn1);
const {
    util
} = __;

export default class Integer extends BaseBlock {
    /**
     * Constructor for "Integer" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters, __.LocalIntegerValueBlock);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 2; // Integer
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "Integer";
    }

    /**
     */
    /**
     * Compare two Integer object, or Integer and ArrayBuffer objects
     * @param {!Integer|ArrayBuffer} otherValue
     * @returns {boolean}
     */
    isEqual(otherValue) {
        if (otherValue instanceof Integer) {
            if (this.valueBlock.isHexOnly && otherValue.valueBlock.isHexOnly) {
                // Compare two ArrayBuffers
                return util.isEqualBuffer(this.valueBlock.valueHex, otherValue.valueBlock.valueHex);
            }

            if (this.valueBlock.isHexOnly === otherValue.valueBlock.isHexOnly) {
                return this.valueBlock.valueDec === otherValue.valueBlock.valueDec;
            }

            return false;
        }

        if (otherValue instanceof ArrayBuffer) {
            return util.isEqualBuffer(this.valueBlock.valueHex, otherValue);
        }

        return false;
    }

    /**
     * Convert current Integer value from BER into DER format
     * @returns {Integer}
     */
    convertToDER() {
        const integer = new Integer({ valueHex: this.valueBlock.valueHex });
        integer.valueBlock.toDER();

        return integer;
    }

    /**
     * Convert current Integer value from DER to BER format
     * @returns {Integer}
     */
    convertFromDER() {
        const expectedLength = this.valueBlock.valueHex.byteLength % 2
            ? this.valueBlock.valueHex.byteLength + 1
            : this.valueBlock.valueHex.byteLength;

        const integer = new Integer({ valueHex: this.valueBlock.valueHex });
        integer.valueBlock.fromDER(integer.valueBlock.valueHex, 0, integer.valueBlock.valueHex.byteLength, expectedLength);

        return integer;
    }
}
