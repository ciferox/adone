const {
    crypto: { asn1 }
} = adone;

const {
    BaseBlock
} = asn1;

const __ = adone.getPrivate(asn1);

export default class OctetString extends BaseBlock {
    /**
     * Constructor for "OctetString" class
     * @param {Object} [parameters={}]
     */
    constructor(parameters = {}) {
        super(parameters, __.LocalOctetStringValueBlock);

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 4; // OctetString
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number} Offset after least decoded byte
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        this.valueBlock.isConstructed = this.idBlock.isConstructed;
        this.valueBlock.isIndefiniteForm = this.lenBlock.isIndefiniteForm;

        //region Ability to encode empty OCTET STRING
        if (inputLength === 0) {
            if (this.idBlock.error.length === 0) {
                this.blockLength += this.idBlock.blockLength;
            }

            if (this.lenBlock.error.length === 0) {
                this.blockLength += this.lenBlock.blockLength;
            }

            return inputOffset;
        }
        //endregion

        return super.fromBER(inputBuffer, inputOffset, inputLength);
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "OctetString";
    }

    /**
     * Checking that two OCTETSTRINGs are equal
     * @param {OctetString} octetString
     */
    isEqual(octetString) {
        //region Check input type
        if ((octetString instanceof OctetString) === false) {
            return false;
        }
        //endregion

        //region Compare two JSON strings
        if (JSON.stringify(this) !== JSON.stringify(octetString)) {
            return false;
        }
        //endregion

        return true;
    }
}
