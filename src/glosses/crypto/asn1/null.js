const {
    crypto: { asn1 }
} = adone;

const {
    BaseBlock
} = asn1;

const __ = adone.private(asn1);

//region Declaration of ASN.1 Null type class

export default class Null extends BaseBlock {
    /**
     * Constructor for "Null" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters, __.LocalBaseBlock); // We will not have a call to "Null value block" because of specified "fromBER" and "toBER" functions

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 5; // Null
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "Null";
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number} Offset after least decoded byte
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        if (this.lenBlock.length > 0) {
            this.warnings.push("Non-zero length of value block for Null type");
        }

        if (this.idBlock.error.length === 0) {
            this.blockLength += this.idBlock.blockLength;
        }

        if (this.lenBlock.error.length === 0) {
            this.blockLength += this.lenBlock.blockLength;
        }

        this.blockLength += inputLength;

        return inputOffset + inputLength;
    }

    /**
     * Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)
     * @param {boolean} [sizeOnly=false] Flag that we need only a size of encoding, not a real array of bytes
     * @returns {ArrayBuffer}
     */
    toBER(sizeOnly = false) {
        const retBuf = new ArrayBuffer(2);

        if (sizeOnly === true) {
            return retBuf;
        }

        const retView = new Uint8Array(retBuf);
        retView[0] = 0x05;
        retView[1] = 0x00;

        return retBuf;
    }
}
