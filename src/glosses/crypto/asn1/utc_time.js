const {
    is,
    crypto: { asn1 }
} = adone;

const {
    VisibleString
} = asn1;

const {
    util
} = adone.private(asn1);

export default class UTCTime extends VisibleString {
    /**
	 * Constructor for "UTCTime" class
	 * @param {Object} [parameters={}]
	 * @property {string} [value] String representatio of the date
	 * @property {Date} [valueDate] JavaScript "Date" object
	 */
    constructor(parameters = {}) {
        super(parameters);

        this.year = 0;
        this.month = 0;
        this.day = 0;
        this.hour = 0;
        this.minute = 0;
        this.second = 0;

        //region Create UTCTime from ASN.1 UTC string value
        if ("value" in parameters) {
            this.fromString(parameters.value);

            this.valueBlock.valueHex = new ArrayBuffer(parameters.value.length);
            const view = new Uint8Array(this.valueBlock.valueHex);

            for (let i = 0; i < parameters.value.length; i++) {
                view[i] = parameters.value.charCodeAt(i);
            }
        }
        //endregion
        //region Create GeneralizedTime from JavaScript Date type
        if ("valueDate" in parameters) {
            this.fromDate(parameters.valueDate);
            this.valueBlock.valueHex = this.toBuffer();
        }
        //endregion

        this.idBlock.tagClass = 1; // UNIVERSAL
        this.idBlock.tagNumber = 23; // UTCTime
    }

    /**
	 * Base function for converting block from BER encoded array of bytes
	 * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
	 * @param {!number} inputOffset Offset in ASN.1 BER encoded array where decoding should be started
	 * @param {!number} inputLength Maximum length of array of bytes which can be using in this function
	 * @returns {number} Offset after least decoded byte
	 */
    fromBER(inputBuffer, inputOffset, inputLength) {
        const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm === true ? inputLength : this.lenBlock.length);
        if (resultOffset === -1) {
            this.error = this.valueBlock.error;
            return resultOffset;
        }

        this.fromBuffer(this.valueBlock.valueHex);

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
	 * Function converting ArrayBuffer into ASN.1 internal string
	 * @param {!ArrayBuffer} inputBuffer ASN.1 BER encoded array
	 */
    fromBuffer(inputBuffer) {
        this.fromString(String.fromCharCode.apply(null, new Uint8Array(inputBuffer)));
    }

    /**
	 * Function converting ASN.1 internal string into ArrayBuffer
	 * @returns {ArrayBuffer}
	 */
    toBuffer() {
        const str = this.toString();

        const buffer = new ArrayBuffer(str.length);
        const view = new Uint8Array(buffer);

        for (let i = 0; i < str.length; i++) {
            view[i] = str.charCodeAt(i);
        }

        return buffer;
    }

    /**
	 * Function converting "Date" object into ASN.1 internal string
	 * @param {!Date} inputDate JavaScript "Date" object
	 */
    fromDate(inputDate) {
        this.year = inputDate.getUTCFullYear();
        this.month = inputDate.getUTCMonth() + 1;
        this.day = inputDate.getUTCDate();
        this.hour = inputDate.getUTCHours();
        this.minute = inputDate.getUTCMinutes();
        this.second = inputDate.getUTCSeconds();
    }

    /**
	 * Function converting ASN.1 internal string into "Date" object
	 * @returns {Date}
	 */
    toDate() {
        return new Date(Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second));
    }

    /**
	 * Function converting JavaScript string into ASN.1 internal class
	 * @param {!string} inputString ASN.1 BER encoded array
	 */
    fromString(inputString) {
        //region Parse input string
        const parser = /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z/ig;
        const parserArray = parser.exec(inputString);
        if (is.null(parserArray)) {
            this.error = "Wrong input string for convertion";
            return;
        }
        //endregion

        //region Store parsed values
        const year = parseInt(parserArray[1], 10);
        if (year >= 50) {
            this.year = 1900 + year;
        } else {
            this.year = 2000 + year;
        }

        this.month = parseInt(parserArray[2], 10);
        this.day = parseInt(parserArray[3], 10);
        this.hour = parseInt(parserArray[4], 10);
        this.minute = parseInt(parserArray[5], 10);
        this.second = parseInt(parserArray[6], 10);
        //endregion
    }

    /**
	 * Function converting ASN.1 internal class into JavaScript string
	 * @returns {string}
	 */
    toString() {
        const outputArray = new Array(7);

        outputArray[0] = util.padNumber(this.year < 2000 ? this.year - 1900 : this.year - 2000, 2);
        outputArray[1] = util.padNumber(this.month, 2);
        outputArray[2] = util.padNumber(this.day, 2);
        outputArray[3] = util.padNumber(this.hour, 2);
        outputArray[4] = util.padNumber(this.minute, 2);
        outputArray[5] = util.padNumber(this.second, 2);
        outputArray[6] = "Z";

        return outputArray.join("");
    }

    /**
	 * Aux function, need to get a block name. Need to have it here for inhiritence
	 * @returns {string}
	 */
    static blockName() {
        return "UTCTime";
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

        object.year = this.year;
        object.month = this.month;
        object.day = this.day;
        object.hour = this.hour;
        object.minute = this.minute;
        object.second = this.second;

        return object;
    }
}
