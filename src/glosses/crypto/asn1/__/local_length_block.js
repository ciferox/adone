const {
    crypto: { asn1 }
} = adone;

const {
    LocalBaseBlock,
    util
} = adone.getPrivate(asn1);

export default class LocalLengthBlock extends LocalBaseBlock {
    /**
     * Constructor for "LocalLengthBlock" class
     * @param {Object} [parameters={}]
     * @property {Object} [lenBlock]
     */
    constructor(parameters = {}) {
        super();

        if ("lenBlock" in parameters) {
            this.isIndefiniteForm = util.getParametersValue(parameters.lenBlock, "isIndefiniteForm", false);
            this.longFormUsed = util.getParametersValue(parameters.lenBlock, "longFormUsed", false);
            this.length = util.getParametersValue(parameters.lenBlock, "length", 0);
        } else {
            this.isIndefiniteForm = false;
            this.longFormUsed = false;
            this.length = 0;
        }
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "lengthBlock";
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
            this.error = "Zero buffer length";
            return -1;
        }

        if (intBuffer[0] === 0xFF) {
            this.error = "Length block 0xFF is reserved by standard";
            return -1;
        }
        //endregion

        //region Check for length form type
        this.isIndefiniteForm = intBuffer[0] === 0x80;
        //endregion

        //region Stop working in case of indefinite length form
        if (this.isIndefiniteForm === true) {
            this.blockLength = 1;
            return inputOffset + this.blockLength;
        }
        //endregion

        //region Check is long form of length encoding using
        this.longFormUsed = !!(intBuffer[0] & 0x80); // eslint-disable-line
        //endregion

        //region Stop working in case of short form of length value
        if (this.longFormUsed === false) {
            this.length = intBuffer[0];
            this.blockLength = 1;
            return inputOffset + this.blockLength;
        }
        //endregion

        //region Calculate length value in case of long form
        const count = intBuffer[0] & 0x7F;

        if (count > 8) {
            // Too big length value
            this.error = "Too big integer";
            return -1;
        }

        if ((count + 1) > intBuffer.length) {
            this.error = "End of input reached before message was fully decoded";
            return -1;
        }

        const lengthBufferView = new Uint8Array(count);

        for (let i = 0; i < count; i++) {
            lengthBufferView[i] = intBuffer[i + 1];
        }

        if (lengthBufferView[count - 1] === 0x00) {
            this.warnings.push("Needlessly long encoded length");
        }

        this.length = util.fromBase(lengthBufferView, 8);

        if (this.longFormUsed && (this.length <= 127)) {
            this.warnings.push("Unneccesary usage of long length form");
        }

        this.blockLength = count + 1;
        //endregion

        return inputOffset + this.blockLength; // Return current offset in input buffer
    }

    /**
     * Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)
     * @param {boolean} [sizeOnly=false] Flag that we need only a size of encoding, not a real array of bytes
     * @returns {ArrayBuffer}
     */
    toBER(sizeOnly = false) {
        //region Initial variables
        let retBuf;
        let retView;
        //endregion

        if (this.length > 127) {
            this.longFormUsed = true;
        }

        if (this.isIndefiniteForm) {
            retBuf = new ArrayBuffer(1);

            if (sizeOnly === false) {
                retView = new Uint8Array(retBuf);
                retView[0] = 0x80;
            }

            return retBuf;
        }

        if (this.longFormUsed === true) {
            const encodedBuf = util.toBase(this.length, 8);

            if (encodedBuf.byteLength > 127) {
                this.error = "Too big length";
                return new ArrayBuffer(0);
            }

            retBuf = new ArrayBuffer(encodedBuf.byteLength + 1);

            if (sizeOnly === true) {
                return retBuf;
            }

            const encodedView = new Uint8Array(encodedBuf);
            retView = new Uint8Array(retBuf);

            retView[0] = encodedBuf.byteLength | 0x80;

            for (let i = 0; i < encodedBuf.byteLength; i++) {
                retView[i + 1] = encodedView[i];
            }

            return retBuf;
        }

        retBuf = new ArrayBuffer(1);

        if (sizeOnly === false) {
            retView = new Uint8Array(retBuf);

            retView[0] = this.length;
        }

        return retBuf;
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

        object.blockName = this.constructor.blockName();
        object.isIndefiniteForm = this.isIndefiniteForm;
        object.longFormUsed = this.longFormUsed;
        object.length = this.length;

        return object;
    }
}
