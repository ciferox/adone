const {
    crypto: { asn1 }
} = adone;

const {
    LocalHexBlock,
    LocalConstructedValueBlock,
    util
} = adone.getPrivate(asn1);

export default class LocalBitStringValueBlock extends LocalHexBlock(LocalConstructedValueBlock) {
    /**
     * Constructor for "LocalBitStringValueBlock" class
     * @param {Object} [parameters={}]
     * @property {ArrayBuffer} [valueHex]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.unusedBits = util.getParametersValue(parameters, "unusedBits", 0);
        this.isConstructed = util.getParametersValue(parameters, "isConstructed", false);
        this.blockLength = this.valueHex.byteLength + 1; // "+1" for "unusedBits"
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number} Offset after least decoded byte
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        //region Ability to decode zero-length BitString value
        if (inputLength === 0) {
            return inputOffset;
        }
        //endregion

        let resultOffset = -1;

        //region If the BISTRING supposed to be a constructed value
        if (this.isConstructed === true) {
            resultOffset = LocalConstructedValueBlock.prototype.fromBER.call(this, inputBuffer, inputOffset, inputLength);
            if (resultOffset === -1) {
                return resultOffset;
            }

            for (let i = 0; i < this.value.length; i++) {
                const currentBlockName = this.value[i].constructor.blockName();

                if (currentBlockName === asn1.EndOfContent.blockName()) {
                    if (this.isIndefiniteForm === true) {
                        break;
                    } else {
                        this.error = "EndOfContent is unexpected, BIT STRING may consists of BIT STRINGs only";
                        return -1;
                    }
                }

                if (currentBlockName !== asn1.BitString.blockName()) {
                    this.error = "BIT STRING may consists of BIT STRINGs only";
                    return -1;
                }

                if ((this.unusedBits > 0) && (this.value[i].unusedBits > 0)) {
                    this.error = "Usign of \"unused bits\" inside constructive BIT STRING allowed for least one only";
                    return -1;
                }

                this.unusedBits = this.value[i].unusedBits;
                if (this.unusedBits > 7) {
                    this.error = "Unused bits for BitString must be in range 0-7";
                    return -1;
                }
            }

            return resultOffset;
        }
        //endregion
        //region If the BitString supposed to be a primitive value
        //region Basic check for parameters
        if (util.checkBufferParams(this, inputBuffer, inputOffset, inputLength) === false) {
            return -1;
        }
        //endregion

        const intBuffer = new Uint8Array(inputBuffer, inputOffset, inputLength);

        this.unusedBits = intBuffer[0];
        if (this.unusedBits > 7) {
            this.error = "Unused bits for BitString must be in range 0-7";
            return -1;
        }

        //region Copy input buffer to internal buffer
        this.valueHex = new ArrayBuffer(intBuffer.length - 1);
        const view = new Uint8Array(this.valueHex);
        for (let i = 0; i < (inputLength - 1); i++) {
            view[i] = intBuffer[i + 1];
        }
        //endregion

        this.blockLength = intBuffer.length;

        return inputOffset + inputLength;
        //endregion
    }

    /**
     * Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)
     * @param {boolean} [sizeOnly=false] Flag that we need only a size of encoding, not a real array of bytes
     * @returns {ArrayBuffer}
     */
    toBER(sizeOnly = false) {
        if (this.isConstructed === true) {
            return LocalConstructedValueBlock.prototype.toBER.call(this, sizeOnly);
        }

        if (sizeOnly === true) {
            return new ArrayBuffer(this.valueHex.byteLength + 1);
        }

        if (this.valueHex.byteLength === 0) {
            return new ArrayBuffer(0);
        }

        const curView = new Uint8Array(this.valueHex);

        const retBuf = new ArrayBuffer(this.valueHex.byteLength + 1);
        const retView = new Uint8Array(retBuf);

        retView[0] = this.unusedBits;

        for (let i = 0; i < this.valueHex.byteLength; i++) {
            retView[i + 1] = curView[i];
        }

        return retBuf;
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "BitStringValueBlock";
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

        object.unusedBits = this.unusedBits;
        object.isConstructed = this.isConstructed;
        object.isHexOnly = this.isHexOnly;
        object.valueHex = util.bufferToHexCodes(this.valueHex, 0, this.valueHex.byteLength);

        return object;
    }
}
