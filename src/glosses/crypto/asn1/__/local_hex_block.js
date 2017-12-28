const {
    crypto: { asn1 }
} = adone;

const {
    util
} = adone.private(asn1);

/**
 * Class used as a base block for all remaining ASN.1 classes
 * @extends LocalBaseBlock
 * @typedef LocalHexBlock
 * @property {number} blockLength
 * @property {string} error
 * @property {Array.<string>} warnings
 * @property {ArrayBuffer} valueBeforeDecode
 * @property {boolean} isHexOnly
 * @property {ArrayBuffer} valueHex
 */

export default function LocalHexBlock(BaseClass) {
    return class LocalHexBlockMixin extends BaseClass {
        /**
         * Constructor for "LocalHexBlock" class
         * @param {Object} [parameters={}]
         * @property {ArrayBuffer} [valueHex]
         */
        constructor(parameters = {}) {
            super(parameters);

            /**
             * @type {boolean}
             */
            this.isHexOnly = util.getParametersValue(parameters, "isHexOnly", false);
            /**
             * @type {ArrayBuffer}
             */
            if ("valueHex" in parameters) {
                this.valueHex = parameters.valueHex.slice(0);
            } else {
                this.valueHex = new ArrayBuffer(0);
            }
        }

        /**
         * Aux function, need to get a block name. Need to have it here for inhiritence
         * @returns {string}
         */
        static blockName() {
            return "hexBlock";
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

            //region Initial checks
            if (intBuffer.length === 0) {
                this.warnings.push("Zero buffer length");
                return inputOffset;
            }
            //endregion

            //region Copy input buffer to internal buffer
            this.valueHex = inputBuffer.slice(inputOffset, inputOffset + inputLength);
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
            if (this.isHexOnly !== true) {
                this.error = "Flag \"isHexOnly\" is not set, abort";
                return new ArrayBuffer(0);
            }

            if (sizeOnly === true) {
                return new ArrayBuffer(this.valueHex.byteLength);
            }

            return this.valueHex.slice(0);
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

            object.blockName = this.constructor.blockName();
            object.isHexOnly = this.isHexOnly;
            object.valueHex = util.bufferToHexCodes(this.valueHex, 0, this.valueHex.byteLength);

            return object;
        }
    };
}
