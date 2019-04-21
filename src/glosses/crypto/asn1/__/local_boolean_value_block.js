const {
    crypto: { asn1 }
} = adone;

const {
    LocalValueBlock,
    util
} = adone.getPrivate(asn1);

export default class LocalBooleanValueBlock extends LocalValueBlock {
    /**
     * Constructor for "LocalBooleanValueBlock" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.value = util.getParametersValue(parameters, "value", false);
        this.isHexOnly = util.getParametersValue(parameters, "isHexOnly", false);

        if ("valueHex" in parameters) {
            this.valueHex = parameters.valueHex.slice(0);
        } else {
            this.valueHex = new ArrayBuffer(1);
            if (this.value === true) {
                const view = new Uint8Array(this.valueHex);
                view[0] = 0xFF;
            }
        }
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number} Offset after least decoded byte
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        //region Basic check for parameters
        if (util.checkBufferParams(this, inputBuffer, inputOffset, inputLength) === false) {
            return -1;
        }
        //endregion

        //region Getting Uint8Array from ArrayBuffer
        const intBuffer = new Uint8Array(inputBuffer, inputOffset, inputLength);
        //endregion

        if (inputLength > 1) {
            this.warnings.push("Boolean value encoded in more then 1 octet");
        }

        this.value = intBuffer[0] !== 0x00;

        this.isHexOnly = true;

        //region Copy input buffer to internal array
        this.valueHex = new ArrayBuffer(intBuffer.length);
        const view = new Uint8Array(this.valueHex);

        for (let i = 0; i < intBuffer.length; i++) {
            view[i] = intBuffer[i];
        }
        //endregion

        this.blockLength = inputLength;

        return inputOffset + inputLength;
    }

    /**
     * Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)
     * @param {boolean} [sizeOnly=false] Flag that we need only a size of encoding, not a real array of bytes
     * @returns {ArrayBuffer}
     */
    toBER(sizeOnly = false) {
        return this.valueHex;
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "BooleanValueBlock";
    }

    /**
     * Convertion for the block to JSON object
     * @returns {{blockName, blockLength, error, warnings, valueBeforeDecode}|{blockName: string, blockLength: number, error: string, warnings: Array.<string>, valueBeforeDecode: string}}
     */
    toJSON() {
        let object = {};

        //region Seems at the moment (Sep 2016) there is no way how to check method is supported in "super" object
        try {
            object = super.toJSON();
        } catch (ex) {
            //
        }
        //endregion

        object.value = this.value;
        object.isHexOnly = this.isHexOnly;
        object.valueHex = util.bufferToHexCodes(this.valueHex, 0, this.valueHex.byteLength);

        return object;
    }
}
