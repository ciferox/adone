const {
    crypto: { asn1 }
} = adone;

const {
    BaseBlock
} = asn1;

const __ = adone.private(asn1);

export default class Constructed extends BaseBlock {
    /**
     * Constructor for "Constructed" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters, __.LocalConstructedValueBlock);

        this.idBlock.isConstructed = true;
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "CONSTRUCTED";
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number}
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        this.valueBlock.isIndefiniteForm = this.lenBlock.isIndefiniteForm;

        const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm === true ? inputLength : this.lenBlock.length);
        if (resultOffset === -1) {
            this.error = this.valueBlock.error;
            return resultOffset;
        }

        if (this.idBlock.error.length === 0) {
            this.blockLength += this.idBlock.blockLength;
        }

        if (this.lenBlock.error.length === 0) {
            this.blockLength += this.lenBlock.blockLength;
        }

        if (this.valueBlock.error.length === 0) {
            this.blockLength += this.valueBlock.blockLength;
        }

        return resultOffset;
    }
}
