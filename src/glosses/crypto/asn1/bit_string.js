const {
    crypto: { asn1 }
} = adone;

const {
    BaseBlock
} = asn1;

const __ = adone.getPrivate(asn1);

export default class BitString extends BaseBlock {
    /**
     * Constructor for "BitString" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters, __.LocalBitStringValueBlock);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 3; // BitString
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "BitString";
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number} Offset after least decoded byte
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        //region Ability to encode empty BitString
        if (inputLength === 0) {
            return inputOffset;
        }
        //endregion

        this.valueBlock.isConstructed = this.idBlock.isConstructed;
        this.valueBlock.isIndefiniteForm = this.lenBlock.isIndefiniteForm;

        return super.fromBER(inputBuffer, inputOffset, inputLength);
    }

    /**
     * Checking that two BITSTRINGs are equal
     * @param {BitString} bitString
     */
    isEqual(bitString) {
        //region Check input type
        if ((bitString instanceof BitString) === false) {
            return false;
        }
        //endregion

        //region Compare two JSON strings
        if (JSON.stringify(this) !== JSON.stringify(bitString)) {
            return false;
        }
        //endregion

        return true;
    }

}
