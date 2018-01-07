const {
    crypto: { asn1 }
} = adone;

const {
    LocalValueBlock,
    util
} = adone.private(asn1);

//region Declaration of basic block for all PRIMITIVE types
export default class LocalPrimitiveValueBlock extends LocalValueBlock {
    /**
     * Constructor for "LocalPrimitiveValueBlock" class
     * @param {Object} [parameters={}]
     * @property {ArrayBuffer} [valueBeforeDecode]
     */
    constructor(parameters = {}) {
        super(parameters);

        //region Variables from "hexBlock" class
        if ("valueHex" in parameters) {
            this.valueHex = parameters.valueHex.slice(0);
        } else {
            this.valueHex = new ArrayBuffer(0);
        }

        this.isHexOnly = util.getParametersValue(parameters, "isHexOnly", true);
        //endregion
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number}
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

        //region Initial checks
        if (intBuffer.length === 0) {
            this.warnings.push("Zero buffer length");
            return inputOffset;
        }
        //endregion

        //region Copy input buffer into internal buffer
        this.valueHex = new ArrayBuffer(intBuffer.length);
        const valueHexView = new Uint8Array(this.valueHex);

        for (let i = 0; i < intBuffer.length; i++) {
            valueHexView[i] = intBuffer[i];
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
        return this.valueHex.slice(0);
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "PrimitiveValueBlock";
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

        object.valueHex = util.bufferToHexCodes(this.valueHex, 0, this.valueHex.byteLength);
        object.isHexOnly = this.isHexOnly;

        return object;
    }
}
