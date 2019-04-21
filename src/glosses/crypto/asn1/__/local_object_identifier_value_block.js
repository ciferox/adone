const {
    crypto: { asn1 }
} = adone;

const {
    LocalValueBlock,
    LocalSidValueBlock,
    util
} = adone.getPrivate(asn1);

export default class LocalObjectIdentifierValueBlock extends LocalValueBlock {
    /**
     * Constructor for "LocalObjectIdentifierValueBlock" class
     * @param {Object} [parameters={}]
     * @property {ArrayBuffer} [valueHex]
     */
    constructor(parameters = {}) {
        super(parameters);

        this.fromString(util.getParametersValue(parameters, "value", ""));
    }

    /**
     * Base function for converting block from BER encoded array of bytes
     * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
     * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
     * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
     * @returns {number} Offset after least decoded byte
     */
    fromBER(inputBuffer, inputOffset, inputLength) {
        let resultOffset = inputOffset;

        while (inputLength > 0) {
            const sidBlock = new LocalSidValueBlock();
            resultOffset = sidBlock.fromBER(inputBuffer, resultOffset, inputLength);
            if (resultOffset === -1) {
                this.blockLength = 0;
                this.error = sidBlock.error;
                return resultOffset;
            }

            if (this.value.length === 0) {
                sidBlock.isFirstSid = true;
            }

            this.blockLength += sidBlock.blockLength;
            inputLength -= sidBlock.blockLength;

            this.value.push(sidBlock);
        }

        return resultOffset;
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
            if (valueBuf.byteLength === 0) {
                this.error = this.value[i].error;
                return new ArrayBuffer(0);
            }

            retBuf = util.concatBuf(retBuf, valueBuf);
        }

        return retBuf;
    }

    /**
     * Create "LocalObjectIdentifierValueBlock" class from string
     * @param {string} string Input string to convert from
     * @returns {boolean}
     */
    fromString(string) {
        this.value = []; // Clear existing SID values

        let pos1 = 0;
        let pos2 = 0;

        let sid = "";

        let flag = false;

        do {
            pos2 = string.indexOf(".", pos1);
            if (pos2 === -1) {
                sid = string.substr(pos1);
            } else {
                sid = string.substr(pos1, pos2 - pos1);
            }

            pos1 = pos2 + 1;

            if (flag) {
                const sidBlock = this.value[0];

                let plus = 0;

                switch (sidBlock.valueDec) {
                    case 0:
                        break;
                    case 1:
                        plus = 40;
                        break;
                    case 2:
                        plus = 80;
                        break;
                    default:
                        this.value = []; // clear SID array
                        return false; // ???
                }

                const parsedSID = parseInt(sid, 10);
                if (isNaN(parsedSID)) {
                    return true;
                }

                sidBlock.valueDec = parsedSID + plus;

                flag = false;
            } else {
                const sidBlock = new LocalSidValueBlock();
                sidBlock.valueDec = parseInt(sid, 10);
                if (isNaN(sidBlock.valueDec)) {
                    return true;
                }

                if (this.value.length === 0) {
                    sidBlock.isFirstSid = true;
                    flag = true;
                }

                this.value.push(sidBlock);
            }
        } while (pos2 !== -1);

        return true;
    }

    /**
     * Converts "LocalObjectIdentifierValueBlock" class to string
     * @returns {string}
     */
    toString() {
        let result = "";
        let isHexOnly = false;

        for (let i = 0; i < this.value.length; i++) {
            isHexOnly = this.value[i].isHexOnly;

            let sidStr = this.value[i].toString();

            if (i !== 0) {
                result = `${result}.`;
            }

            if (isHexOnly) {
                sidStr = `{${sidStr}}`;

                if (this.value[i].isFirstSid) {
                    result = `2.{${sidStr} - 80}`;
                } else {
                    result = result + sidStr;
                }
            } else {
                result = result + sidStr;
            }
        }

        return result;
    }

    /**
     * Aux function, need to get a block name. Need to have it here for inhiritence
     * @returns {string}
     */
    static blockName() {
        return "ObjectIdentifierValueBlock";
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

        object.value = this.toString();
        object.sidArray = [];
        for (let i = 0; i < this.value.length; i++) {
            object.sidArray.push(this.value[i].toJSON());
        }

        return object;
    }
}
