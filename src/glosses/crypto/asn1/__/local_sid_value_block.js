const {
    crypto: { asn1 }
} = adone;

const {
    LocalHexBlock,
    LocalBaseBlock,
    util
} = adone.getPrivate(asn1);

//region Declaration of ASN.1 ObjectIdentifier type class
export default class LocalSidValueBlock extends LocalHexBlock(LocalBaseBlock) {
    /**
     * Constructor for "LocalSidValueBlock" class
     * @param {Object} [parameters={}]
     * @property {number} [valueDec]
     * @property {boolean} [isFirstSid]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.valueDec = util.getParametersValue(parameters, "valueDec", -1);
        this.isFirstSid = util.getParametersValue(parameters, "isFirstSid", false);
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "sidBlock";
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number} Offset after least decoded byte
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        if (inputLength === 0) {
            return inputOffset;
        }

        //region Basic check for parameters
        if (util.checkBufferParams(this, inputBuffer, inputOffset, inputLength) === false) {
            return -1;
        }
        //endregion

        const intBuffer = new Uint8Array(inputBuffer, inputOffset, inputLength);

        this.valueHex = new ArrayBuffer(inputLength);
        let view = new Uint8Array(this.valueHex);

        for (let i = 0; i < inputLength; i++) {
            view[i] = intBuffer[i] & 0x7F;

            this.blockLength++;

            if ((intBuffer[i] & 0x80) === 0x00) {
                break;
            }
        }

        //region Ajust size of valueHex buffer
        const tempValueHex = new ArrayBuffer(this.blockLength);
        const tempView = new Uint8Array(tempValueHex);

        for (let i = 0; i < this.blockLength; i++) {
            tempView[i] = view[i];
        }

        this.valueHex = tempValueHex.slice(0);
        view = new Uint8Array(this.valueHex);
        //endregion

        if ((intBuffer[this.blockLength - 1] & 0x80) !== 0x00) {
            this.error = "End of input reached before message was fully decoded";
            return -1;
        }

        if (view[0] === 0x00) {
            this.warnings.push("Needlessly long format of SID encoding");
        }

        if (this.blockLength <= 8) {
            this.valueDec = util.fromBase(view, 7);
        } else {
            this.isHexOnly = true;
            this.warnings.push("Too big SID for decoding, hex only");
        }

        return inputOffset + this.blockLength;
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

        if (this.isHexOnly) {
            if (sizeOnly === true) {
                return new ArrayBuffer(this.valueHex.byteLength);
            }

            const curView = new Uint8Array(this.valueHex);

            retBuf = new ArrayBuffer(this.blockLength);
            retView = new Uint8Array(retBuf);

            for (let i = 0; i < (this.blockLength - 1); i++) {
                retView[i] = curView[i] | 0x80;
            }

            retView[this.blockLength - 1] = curView[this.blockLength - 1];

            return retBuf;
        }

        const encodedBuf = util.toBase(this.valueDec, 7);
        if (encodedBuf.byteLength === 0) {
            this.error = "Error during encoding SID value";
            return new ArrayBuffer(0);
        }

        retBuf = new ArrayBuffer(encodedBuf.byteLength);

        if (sizeOnly === false) {
            const encodedView = new Uint8Array(encodedBuf);
            retView = new Uint8Array(retBuf);

            for (let i = 0; i < (encodedBuf.byteLength - 1); i++) {
                retView[i] = encodedView[i] | 0x80;
            }

            retView[encodedBuf.byteLength - 1] = encodedView[encodedBuf.byteLength - 1];
        }

        return retBuf;
    }

    /**
     * Create string representation of current SID block
     * @returns {string}
     */
    toString() {
        let result = "";

        if (this.isHexOnly === true) {
            result = util.bufferToHexCodes(this.valueHex, 0, this.valueHex.byteLength);
        } else {
            if (this.isFirstSid) {
                let sidValue = this.valueDec;

                if (this.valueDec <= 39) {
                    result = "0.";
                } else {
                    if (this.valueDec <= 79) {
                        result = "1.";
                        sidValue -= 40;
                    } else {
                        result = "2.";
                        sidValue -= 80;
                    }
                }

                result = result + sidValue.toString();
            } else {
                result = this.valueDec.toString();
            }
        }

        return result;
    }

    /**
     * Convertion for the block to JSON object
     * @returns {Object}
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

        object.valueDec = this.valueDec;
        object.isFirstSid = this.isFirstSid;

        return object;
    }
}
