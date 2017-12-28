const {
    crypto: { asn1 }
} = adone;

const {
    LocalBaseBlock
} = adone.private(asn1);

//region Declaration of value block class
//**************************************************************************************
export default class LocalValueBlock extends LocalBaseBlock {
    //**********************************************************************************
    /**
	 * Constructor for "LocalValueBlock" class
	 * @param {Object} [parameters={}]
	 */
    constructor(parameters = {}) {
        super(parameters);
    }

    //**********************************************************************************
    /**
	 * Aux function, need to get a block name. Need to have it here for inhiritence
	 * @returns {string}
	 */
    static blockName() {
        return "valueBlock";
    }

    //**********************************************************************************
    //noinspection JSUnusedLocalSymbols,JSUnusedLocalSymbols,JSUnusedLocalSymbols
    /**
	 * Base function for converting block from BER encoded array of bytes
	 * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
	 * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
	 * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
	 * @returns {number}
	 */
    fromBER(inputBuffer, inputOffset, inputLength) {
        //region Throw an exception for a function which needs to be specified in extended classes
        throw new TypeError("User need to make a specific function in a class which extends \"LocalValueBlock\"");
        //endregion
    }

    //**********************************************************************************
    //noinspection JSUnusedLocalSymbols
    /**
	 * Encoding of current ASN.1 block into ASN.1 encoded array (BER rules)
	 * @param {boolean} [sizeOnly=false] Flag that we need only a size of encoding, not a real array of bytes
	 * @returns {ArrayBuffer}
	 */
    toBER(sizeOnly = false) {
        //region Throw an exception for a function which needs to be specified in extended classes
        throw new TypeError("User need to make a specific function in a class which extends \"LocalValueBlock\"");
        //endregion
    }
    //**********************************************************************************
}
