const {
    crypto: { asn1 }
} = adone;

const { util } = adone.private(asn1);

/**
 * Class used as a base block for all remaining ASN.1 classes
 * @typedef LocalBaseBlock
 * @interface
 * @property {number} blockLength
 * @property {string} error
 * @property {Array.<string>} warnings
 * @property {ArrayBuffer} valueBeforeDecode
 */
export default class LocalBaseBlock {
    /**
     * Constructor for "LocalBaseBlock" class
     * @param {Object} [parameters={}]
     * @property {ArrayBuffer} [valueBeforeDecode]
     */
    constructor(parameters = {}) {
        /**
         * @type {number} blockLength
         */
        this.blockLength = util.getParametersValue(parameters, "blockLength", 0);
        /**
         * @type {string} error
         */
        this.error = util.getParametersValue(parameters, "error", "");
        /**
         * @type {Array.<string>} warnings
         */
        this.warnings = util.getParametersValue(parameters, "warnings", []);
        /**
		 * @type {ArrayBuffer} valueBeforeDecode
		 */
        if ("valueBeforeDecode" in parameters) {
            this.valueBeforeDecode = parameters.valueBeforeDecode.slice(0);
        } else {
            this.valueBeforeDecode = new ArrayBuffer(0);
        }
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "baseBlock";
    }

    /**
     * Convertion for the block to JSON object
     * @returns {{blockName: string, blockLength: number, error: string, warnings: Array.<string>, valueBeforeDecode: string}}
     */
    toJSON() {
        return {
            blockName: this.constructor.blockName(),
            blockLength: this.blockLength,
            error: this.error,
            warnings: this.warnings,
            valueBeforeDecode: util.bufferToHexCodes(this.valueBeforeDecode, 0, this.valueBeforeDecode.byteLength)
        };
    }
}
