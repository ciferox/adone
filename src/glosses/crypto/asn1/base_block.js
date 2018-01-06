const {
    crypto: { asn1 }
} = adone;

const __ = adone.private(asn1);

const {
    LocalBaseBlock,
    util
} = __;

// Declaration of basic ASN.1 block class
export default class BaseBlock extends LocalBaseBlock {
    /**
     * Constructor for "BaseBlock" class
     * @param {Object} [parameters={}]
     * @property {Object} [primitiveSchema]
     * @property {string} [name]
     * @property {boolean} [optional]
     * @param valueBlockType Type of value block
     */
    constructor(parameters = {}, valueBlockType = __.LocalValueBlock) {
        super(parameters);

        if ("name" in parameters) {
            this.name = parameters.name;
        }
        if ("optional" in parameters) {
            this.optional = parameters.optional;
        }
        if ("primitiveSchema" in parameters) {
            this.primitiveSchema = parameters.primitiveSchema;
        }

        this.idBlock = new __.LocalIdentificationBlock(parameters);
        this.lenBlock = new __.LocalLengthBlock(parameters);
        this.valueBlock = new valueBlockType(parameters);
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "BaseBlock";
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number}
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm === true ? inputLength : this.lenBlock.length);
        if (resultOffset === -1) {
            this.error = this.valueBlock.error;
            return resultOffset;
        }

        if (this.idBlock.error.length === 0) {
            this.blockLength += this.idBlock.blockLength;
        }

        if (this.lenBlock.error.length === 0) {
            this.blockLength += this.lenBlock.blockLength;
        }

        if (this.valueBlock.error.length === 0) {
            this.blockLength += this.valueBlock.blockLength;
        }

        return resultOffset;
    }

    /**
     * Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)
     * @param {boolean} [sizeOnly=false] Flag that we need only a size of encoding, not a real array of bytes
     * @returns {ArrayBuffer}
     */
    toBER(sizeOnly = false) {
        let retBuf;

        const idBlockBuf = this.idBlock.toBER(sizeOnly);
        const valueBlockSizeBuf = this.valueBlock.toBER(true);

        this.lenBlock.length = valueBlockSizeBuf.byteLength;
        const lenBlockBuf = this.lenBlock.toBER(sizeOnly);

        retBuf = util.concatBuf(idBlockBuf, lenBlockBuf);

        let valueBlockBuf;

        if (sizeOnly === false) {
            valueBlockBuf = this.valueBlock.toBER(sizeOnly);
        } else {
            valueBlockBuf = new ArrayBuffer(this.lenBlock.length);
        }

        retBuf = util.concatBuf(retBuf, valueBlockBuf);

        if (this.lenBlock.isIndefiniteForm === true) {
            const indefBuf = new ArrayBuffer(2);

            if (sizeOnly === false) {
                const indefView = new Uint8Array(indefBuf);

                indefView[0] = 0x00;
                indefView[1] = 0x00;
            }

            retBuf = util.concatBuf(retBuf, indefBuf);
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

        object.idBlock = this.idBlock.toJSON();
        object.lenBlock = this.lenBlock.toJSON();
        object.valueBlock = this.valueBlock.toJSON();

        if ("name" in this) {
            object.name = this.name;
        }
        if ("optional" in this) {
            object.optional = this.optional;
        }
        if ("primitiveSchema" in this) {
            object.primitiveSchema = this.primitiveSchema.toJSON();
        }

        return object;
    }
}
