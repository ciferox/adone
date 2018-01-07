const {
    crypto: { asn1 }
} = adone;

const {
    BaseBlock
} = asn1;

const __ = adone.private(asn1);

export default class BmpString extends BaseBlock {
    /**
     * Constructor for "BmpString" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters, __.LocalBmpStringValueBlock);

        if ("value" in parameters) {
            this.fromString(parameters.value);
        }

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 30; // BmpString
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "BmpString";
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
        const copyBuffer = inputBuffer.slice(0);
        const valueView = new Uint8Array(copyBuffer);

        for (let i = 0; i < valueView.length; i = i + 2) {
            const temp = valueView[i];

            valueView[i] = valueView[i + 1];
            valueView[i + 1] = temp;
        }

        this.valueBlock.value = String.fromCharCode.apply(null, new Uint16Array(copyBuffer));
    }

    /**
     * Function converting JavaScript string into ASN.1 internal class
     * @param {!string} inputString ASN.1 BER encoded array
     */
    fromString(inputString) {
        const strLength = inputString.length;

        this.valueBlock.valueHex = new ArrayBuffer(strLength * 2);
        const valueHexView = new Uint8Array(this.valueBlock.valueHex);

        for (let i = 0; i < strLength; i++) {
            const codeBuf = __.util.toBase(inputString.charCodeAt(i), 8);
            const codeView = new Uint8Array(codeBuf);
            if (codeView.length > 2) {
                continue;
            }

            const dif = 2 - codeView.length;

            for (let j = codeView.length - 1; j >= 0; j--) {
                valueHexView[i * 2 + j + dif] = codeView[j];
            }
        }

        this.valueBlock.value = inputString;
    }

}
