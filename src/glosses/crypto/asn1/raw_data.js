const {
    crypto: { asn1 }
} = adone;

const {
    util
} = adone.private(asn1);

/**
 * @description Special class providing ability to have "toBER/fromBER" for raw ArrayBuffer
 */
export default class RawData {
    /**
     * Constructor for "Repeated" class
     * @param {Object} [parameters={}]
     * @property {string} [name]
     * @property {boolean} [optional]
     */
    constructor(parameters = {}) {
        this.data = util.getParametersValue(parameters, "data", new ArrayBuffer(0));
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number} Offset after least decoded byte
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        this.data = inputBuffer.slice(inputOffset, inputLength);
    }

    /**
     * Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)
     * @param {boolean} [sizeOnly=false] Flag that we need only a size of encoding, not a real array of bytes
     * @returns {ArrayBuffer}
     */
    toBER(sizeOnly = false) {
        return this.data;
    }
}
