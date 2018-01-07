const {
    crypto: { asn1 }
} = adone;

const {
    LocalValueBlock,
    util
} = adone.private(asn1);

// Declaration of basic block for all CONSTRUCTED types
export default class LocalConstructedValueBlock extends LocalValueBlock {
    /**
     * Constructor for "LocalConstructedValueBlock" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.value = util.getParametersValue(parameters, "value", []);
        this.isIndefiniteForm = util.getParametersValue(parameters, "isIndefiniteForm", false);
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number}
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        //region Store initial offset and length
        const initialOffset = inputOffset;
        const initialLength = inputLength;
        //endregion

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

        //region Aux function
        const checkLen = (indefiniteLength, length) => {
            if (indefiniteLength === true) {
                return 1;
            }

            return length;
        };
        //endregion

        let currentOffset = inputOffset;

        while (checkLen(this.isIndefiniteForm, inputLength) > 0) {
            const returnObject = util.LocalFromBER(inputBuffer, currentOffset, inputLength);
            if (returnObject.offset === -1) {
                this.error = returnObject.result.error;
                this.warnings.concat(returnObject.result.warnings);
                return -1;
            }

            currentOffset = returnObject.offset;

            this.blockLength += returnObject.result.blockLength;
            inputLength -= returnObject.result.blockLength;

            this.value.push(returnObject.result);

            if ((this.isIndefiniteForm === true) && (returnObject.result.constructor.blockName() === asn1.EndOfContent.blockName())) {
                break;
            }
        }

        if (this.isIndefiniteForm === true) {
            if (this.value[this.value.length - 1].constructor.blockName() === asn1.EndOfContent.blockName()) {
                this.value.pop();
            } else {
                this.warnings.push("No EndOfContent block encoded");
            }
        }

        //region Copy "inputBuffer" to "valueBeforeDecode"
        this.valueBeforeDecode = inputBuffer.slice(initialOffset, initialOffset + initialLength);
        //endregion

        return currentOffset;
    }

    /**
     * Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)
     * @param {boolean} [sizeOnly=false] Flag that we need only a size of encoding, not a real array of bytes
     * @returns {ArrayBuffer}
     */
    toBER(sizeOnly = false) {
        let retBuf = new ArrayBuffer(0);
        for (let i = 0; i < this.value.length; i++) {
            const valueBuf = this.value[i].toBER(sizeOnly);
            retBuf = util.concatBuf(retBuf, valueBuf);
        }

        return retBuf;
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "ConstructedValueBlock";
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

        object.isIndefiniteForm = this.isIndefiniteForm;
        object.value = [];
        for (let i = 0; i < this.value.length; i++) {
            object.value.push(this.value[i].toJSON());
        }

        return object;
    }
}
