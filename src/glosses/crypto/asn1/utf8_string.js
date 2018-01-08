const {
    crypto: { asn1 }
} = adone;

const {
    BaseBlock
} = asn1;

const __ = adone.private(asn1);

export default class Utf8String extends BaseBlock {
    /**
     * Constructor for "Utf8String" class
     * @param {Object} [parameters={}]
     * @property {ArrayBuffer} [valueHex]
     */
    constructor(parameters = {}) {
        super(parameters, __.LocalUtf8StringValueBlock);

        if ("value" in parameters) {
            this.fromString(parameters.value);
        }

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 12; // Utf8String
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "Utf8String";
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number} Offset after least decoded byte
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm === true ? inputLength : this.lenBlock.length);
        if (resultOffset === -1) {
            this.error = this.valueBlock.error;
            return resultOffset;
        }

        this.fromBuffer(this.valueBlock.valueHex);

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

    /**
     * Function converting ArrayBuffer into ASN.1 internal string
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     */
    fromBuffer(inputBuffer) {
        this.valueBlock.value = String.fromCharCode.apply(null, new Uint8Array(inputBuffer));

        try {
            this.valueBlock.value = decodeURIComponent(escape(this.valueBlock.value));
        } catch (ex) {
            this.warnings.push(`Error during "decodeURIComponent": ${ex}, using raw string`);
        }
    }

    /**
     * Function converting JavaScript string into ASN.1 internal class
     * @param {!string} inputString ASN.1 BER encoded array
     */
    fromString(inputString) {
        const str = unescape(encodeURIComponent(inputString));
        const strLen = str.length;

        this.valueBlock.valueHex = new ArrayBuffer(strLen);
        const view = new Uint8Array(this.valueBlock.valueHex);

        for (let i = 0; i < strLen; i++) {
            view[i] = str.charCodeAt(i);
        }

        this.valueBlock.value = inputString;
    }
}