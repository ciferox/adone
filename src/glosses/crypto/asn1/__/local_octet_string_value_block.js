const {
    crypto: { asn1 }
} = adone;

const {
    LocalHexBlock,
    LocalConstructedValueBlock,
    util
} = adone.private(asn1);

export default class LocalOctetStringValueBlock extends LocalHexBlock(LocalConstructedValueBlock) {
    /**
	 * Constructor for "LocalOctetStringValueBlock" class
	 * @param {Object} [parameters={}]
	 * @property {ArrayBuffer} [valueHex]
	 */
    constructor(parameters = {}) {
        super(parameters);

        this.isConstructed = util.getParametersValue(parameters, "isConstructed", false);
    }

    /**
	 * Base function for converting block from BER encoded array of bytes
	 * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
	 * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
	 * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
	 * @returns {number} Offset after least decoded byte
	 */
    fromBER(inputBuffer, inputOffset, inputLength) {
        let resultOffset = 0;

        if (this.isConstructed === true) {
            this.isHexOnly = false;

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
                        this.error = "EndOfContent is unexpected, OCTET STRING may consists of OCTET STRINGs only";
                        return -1;
                    }
                }

                if (currentBlockName !== asn1.OctetString.blockName()) {
                    this.error = "OCTET STRING may consists of OCTET STRINGs only";
                    return -1;
                }
            }
        } else {
            this.isHexOnly = true;

            resultOffset = super.fromBER(inputBuffer, inputOffset, inputLength);
            this.blockLength = inputLength;
        }

        return resultOffset;
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

        let retBuf = new ArrayBuffer(this.valueHex.byteLength);

        if (sizeOnly === true) {
            return retBuf;
        }

        if (this.valueHex.byteLength === 0) {
            return retBuf;
        }

        retBuf = this.valueHex.slice(0);

        return retBuf;
    }

    /**
	 * Aux function, need to get a block name. Need to have it here for inhiritence
	 * @returns {string}
	 */
    static blockName() {
        return "OctetStringValueBlock";
    }

    toJSON() {
        let object = {};

        //region Seems at the moment (Sep 2016) there is no way how to check method is supported in "super" object
        try {
            object = super.toJSON();
        } catch (ex) {
            //
        }
        //endregion

        object.isConstructed = this.isConstructed;
        object.isHexOnly = this.isHexOnly;
        object.valueHex = util.bufferToHexCodes(this.valueHex, 0, this.valueHex.byteLength);

        return object;
    }
}
