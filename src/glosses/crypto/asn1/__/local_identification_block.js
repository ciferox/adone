const {
    crypto: { asn1 }
} = adone;

const {
    LocalHexBlock,
    LocalBaseBlock,
    util
} = adone.getPrivate(asn1);

// Declaration of identification block class
export default class LocalIdentificationBlock extends LocalHexBlock(LocalBaseBlock) {
    /**
     * Constructor for "LocalBaseBlock" class
     * @param {Object} [parameters={}]
     * @property {Object} [idBlock]
     */
    constructor(parameters = {}) {
        super();

        if ("idBlock" in parameters) {
            //region Properties from hexBlock class
            this.isHexOnly = util.getParametersValue(parameters.idBlock, "isHexOnly", false);
            this.valueHex = util.getParametersValue(parameters.idBlock, "valueHex", new ArrayBuffer(0));
            //endregion

            this.tagClass = util.getParametersValue(parameters.idBlock, "tagClass", -1);
            this.tagNumber = util.getParametersValue(parameters.idBlock, "tagNumber", -1);
            this.isConstructed = util.getParametersValue(parameters.idBlock, "isConstructed", false);
        } else {
            this.tagClass = -1;
            this.tagNumber = -1;
            this.isConstructed = false;
        }
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "identificationBlock";
    }

    /**
     * Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)
     * @param {boolean} [sizeOnly=false] Flag that we need only a size of encoding, not a real array of bytes
     * @returns {ArrayBuffer}
     */
    toBER(sizeOnly = false) {
        //region Initial variables
        let firstOctet = 0;
        let retBuf;
        let retView;
        //endregion

        switch (this.tagClass) {
            case 1:
                firstOctet |= 0x00; // UNIVERSAL
                break;
            case 2:
                firstOctet |= 0x40; // APPLICATION
                break;
            case 3:
                firstOctet |= 0x80; // CONTEXT-SPECIFIC
                break;
            case 4:
                firstOctet |= 0xC0; // PRIVATE
                break;
            default:
                this.error = "Unknown tag class";
                return new ArrayBuffer(0);
        }

        if (this.isConstructed) {
            firstOctet |= 0x20;
        }

        if ((this.tagNumber < 31) && !this.isHexOnly) {
            retBuf = new ArrayBuffer(1);
            retView = new Uint8Array(retBuf);

            if (!sizeOnly) {
                let number = this.tagNumber;
                number &= 0x1F;
                firstOctet |= number;

                retView[0] = firstOctet;
            }

            return retBuf;
        }

        if (this.isHexOnly === false) {
            const encodedBuf = util.toBase(this.tagNumber, 7);
            const encodedView = new Uint8Array(encodedBuf);
            const size = encodedBuf.byteLength;

            retBuf = new ArrayBuffer(size + 1);
            retView = new Uint8Array(retBuf);
            retView[0] = firstOctet | 0x1F;

            if (!sizeOnly) {
                for (let i = 0; i < (size - 1); i++) {
                    retView[i + 1] = encodedView[i] | 0x80;
                }

                retView[size] = encodedView[size - 1];
            }

            return retBuf;
        }

        retBuf = new ArrayBuffer(this.valueHex.byteLength + 1);
        retView = new Uint8Array(retBuf);

        retView[0] = firstOctet | 0x1F;

        if (sizeOnly === false) {
            const curView = new Uint8Array(this.valueHex);

            for (let i = 0; i < (curView.length - 1); i++) {
                retView[i + 1] = curView[i] | 0x80;
            }

            retView[this.valueHex.byteLength] = curView[curView.length - 1];
        }

        return retBuf;
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
        //endregion

        //region Find tag class
        const tagClassMask = intBuffer[0] & 0xC0;

        switch (tagClassMask) {
            case 0x00:
                this.tagClass = 1; // UNIVERSAL
                break;
            case 0x40:
                this.tagClass = 2; // APPLICATION
                break;
            case 0x80:
                this.tagClass = 3; // CONTEXT-SPECIFIC
                break;
            case 0xC0:
                this.tagClass = 4; // PRIVATE
                break;
            default:
                this.error = "Unknown tag class";
                return -1;
        }
        //endregion

        //region Find it's constructed or not
        this.isConstructed = (intBuffer[0] & 0x20) === 0x20;
        //endregion

        //region Find tag number
        this.isHexOnly = false;

        const tagNumberMask = intBuffer[0] & 0x1F;

        if (tagNumberMask !== 0x1F) {
            this.tagNumber = tagNumberMask;
            this.blockLength = 1;
        } else {
            let count = 1;

            this.valueHex = new ArrayBuffer(255);
            let tagNumberBufferMaxLength = 255;
            let intTagNumberBuffer = new Uint8Array(this.valueHex);

            while (intBuffer[count] & 0x80) {
                intTagNumberBuffer[count - 1] = intBuffer[count] & 0x7F;
                count++;

                if (count >= intBuffer.length) {
                    this.error = "End of input reached before message was fully decoded";
                    return -1;
                }

                //region In case if tag number length is greater than 255 bytes (rare but possible case)
                if (count === tagNumberBufferMaxLength) {
                    tagNumberBufferMaxLength += 255;

                    const tempBuffer = new ArrayBuffer(tagNumberBufferMaxLength);
                    const tempBufferView = new Uint8Array(tempBuffer);

                    for (let i = 0; i < intTagNumberBuffer.length; i++) {
                        tempBufferView[i] = intTagNumberBuffer[i];
                    }

                    this.valueHex = new ArrayBuffer(tagNumberBufferMaxLength);
                    intTagNumberBuffer = new Uint8Array(this.valueHex);
                }
                //endregion
            }

            this.blockLength = count + 1;
            intTagNumberBuffer[count - 1] = intBuffer[count] & 0x7F; // Write last byte to buffer

            //region Cut buffer
            const tempBuffer = new ArrayBuffer(count);
            const tempBufferView = new Uint8Array(tempBuffer);

            for (let i = 0; i < count; i++) {
                tempBufferView[i] = intTagNumberBuffer[i];
            }

            this.valueHex = new ArrayBuffer(count);
            intTagNumberBuffer = new Uint8Array(this.valueHex);
            intTagNumberBuffer.set(tempBufferView);
            //endregion

            //region Try to convert long tag number to short form
            if (this.blockLength <= 9) {
                this.tagNumber = util.fromBase(intTagNumberBuffer, 7);
            } else {
                this.isHexOnly = true;
                this.warnings.push("Tag too long, represented as hex-coded");
            }
            //endregion
        }
        //endregion

        //region Check if constructed encoding was using for primitive type
        if (((this.tagClass === 1)) &&
			this.isConstructed) {
            switch (this.tagNumber) {
                case 1: // Boolean
                case 2: // REAL
                case 5: // Null
                case 6: // OBJECT IDENTIFIER
                case 9: // REAL
                case 14: // Time
                case 23:
                case 24:
                case 31:
                case 32:
                case 33:
                case 34:
                    this.error = "Constructed encoding used for primitive type";
                    return -1;
                default:
            }
        }
        //endregion

        return inputOffset + this.blockLength; // Return current offset in input buffer
    }

    /**
     * Convertion for the block to JSON object
     * @returns {{blockName: string,
     *  tagClass: number,
     *  tagNumber: number,
     *  isConstructed: boolean,
     *  isHexOnly: boolean,
     *  valueHex: ArrayBuffer,
     *  blockLength: number,
     *  error: string, warnings: Array.<string>,
     *  valueBeforeDecode: string}}
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
        object.tagClass = this.tagClass;
        object.tagNumber = this.tagNumber;
        object.isConstructed = this.isConstructed;

        return object;
    }
}
