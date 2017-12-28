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

export default class GeneralizedTime extends VisibleString {
    /**
	 * Constructor for "GeneralizedTime" class
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
        this.millisecond = 0;

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
        this.idBlock.tagNumber = 24; // GeneralizedTime
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
        this.millisecond = inputDate.getUTCMilliseconds();
    }

    /**
	 * Function converting ASN.1 internal string into "Date" object
	 * @returns {Date}
	 */
    toDate() {
        return new Date(Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second, this.millisecond));
    }

    /**
	 * Function converting JavaScript string into ASN.1 internal class
	 * @param {!string} inputString ASN.1 BER encoded array
	 */
    fromString(inputString) {
        //region Initial variables
        let isUTC = false;

        let timeString = "";
        let dateTimeString = "";
        let fractionPart = 0;

        let parser;

        let hourDifference = 0;
        let minuteDifference = 0;
        //endregion

        //region Convert as UTC time
        if (inputString[inputString.length - 1] === "Z") {
            timeString = inputString.substr(0, inputString.length - 1);

            isUTC = true;
        }
        //endregion
        //region Convert as local time
        else {
            //noinspection JSPrimitiveTypeWrapperUsage
            const number = new Number(inputString[inputString.length - 1]);

            if (isNaN(number.valueOf())) {
                throw new Error("Wrong input string for convertion");
            }

            timeString = inputString;
        }
        //endregion

        //region Check that we do not have a "+" and "-" symbols inside UTC time
        if (isUTC) {
            if (timeString.includes("+")) {
                throw new Error("Wrong input string for convertion");
            }

            if (timeString.includes("-")) {
                throw new Error("Wrong input string for convertion");
            }
        } else {
            //region Get "UTC time difference" in case of local time
            let multiplier = 1;
            let differencePosition = timeString.indexOf("+");
            let differenceString = "";

            if (differencePosition === -1) {
                differencePosition = timeString.indexOf("-");
                multiplier = -1;
            }

            if (differencePosition !== -1) {
                differenceString = timeString.substr(differencePosition + 1);
                timeString = timeString.substr(0, differencePosition);

                if ((differenceString.length !== 2) && (differenceString.length !== 4)) {
                    throw new Error("Wrong input string for convertion");
                }

                //noinspection JSPrimitiveTypeWrapperUsage
                let number = new Number(differenceString.substr(0, 2));

                if (isNaN(number.valueOf())) {
                    throw new Error("Wrong input string for convertion");
                }

                hourDifference = multiplier * number;

                if (differenceString.length === 4) {
                    //noinspection JSPrimitiveTypeWrapperUsage
                    number = new Number(differenceString.substr(2, 2));

                    if (isNaN(number.valueOf())) {
                        throw new Error("Wrong input string for convertion");
                    }

                    minuteDifference = multiplier * number;
                }
            }
        }
        //endregion

        //region Get position of fraction point
        let fractionPointPosition = timeString.indexOf("."); // Check for "full stop" symbol
        if (fractionPointPosition === -1) {
            fractionPointPosition = timeString.indexOf(",");
        } // Check for "comma" symbol
        //endregion

        //region Get fraction part
        if (fractionPointPosition !== -1) {
            //noinspection JSPrimitiveTypeWrapperUsage
            const fractionPartCheck = new Number(`0${timeString.substr(fractionPointPosition)}`);

            if (isNaN(fractionPartCheck.valueOf())) {
                throw new Error("Wrong input string for convertion");
            }

            fractionPart = fractionPartCheck.valueOf();

            dateTimeString = timeString.substr(0, fractionPointPosition);
        } else {
            dateTimeString = timeString;
        }
        //endregion

        //region Parse internal date
        switch (true) {
            case dateTimeString.length === 8: // "YYYYMMDD"
                parser = /(\d{4})(\d{2})(\d{2})/ig;
                if (fractionPointPosition !== -1) {
                    throw new Error("Wrong input string for convertion");
                } // Here we should not have a "fraction point"
                break;
            case dateTimeString.length === 10: // "YYYYMMDDHH"
                parser = /(\d{4})(\d{2})(\d{2})(\d{2})/ig;

                if (fractionPointPosition !== -1) {
                    let fractionResult = 60 * fractionPart;
                    this.minute = Math.floor(fractionResult);

                    fractionResult = 60 * (fractionResult - this.minute);
                    this.second = Math.floor(fractionResult);

                    fractionResult = 1000 * (fractionResult - this.second);
                    this.millisecond = Math.floor(fractionResult);
                }
                break;
            case dateTimeString.length === 12: // "YYYYMMDDHHMM"
                parser = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/ig;

                if (fractionPointPosition !== -1) {
                    let fractionResult = 60 * fractionPart;
                    this.second = Math.floor(fractionResult);

                    fractionResult = 1000 * (fractionResult - this.second);
                    this.millisecond = Math.floor(fractionResult);
                }
                break;
            case dateTimeString.length === 14: // "YYYYMMDDHHMMSS"
                parser = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/ig;

                if (fractionPointPosition !== -1) {
                    const fractionResult = 1000 * fractionPart;
                    this.millisecond = Math.floor(fractionResult);
                }
                break;
            default:
                throw new Error("Wrong input string for convertion");
        }
        //endregion

        //region Put parsed values at right places
        const parserArray = parser.exec(dateTimeString);
        if (is.null(parserArray)) {
            throw new Error("Wrong input string for convertion");
        }

        for (let j = 1; j < parserArray.length; j++) {
            switch (j) {
                case 1:
                    this.year = parseInt(parserArray[j], 10);
                    break;
                case 2:
                    this.month = parseInt(parserArray[j], 10);
                    break;
                case 3:
                    this.day = parseInt(parserArray[j], 10);
                    break;
                case 4:
                    this.hour = parseInt(parserArray[j], 10) + hourDifference;
                    break;
                case 5:
                    this.minute = parseInt(parserArray[j], 10) + minuteDifference;
                    break;
                case 6:
                    this.second = parseInt(parserArray[j], 10);
                    break;
                default:
                    throw new Error("Wrong input string for convertion");
            }
        }
        //endregion

        //region Get final date
        if (isUTC === false) {
            const tempDate = new Date(this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond);

            this.year = tempDate.getUTCFullYear();
            this.month = tempDate.getUTCMonth();
            this.day = tempDate.getUTCDay();
            this.hour = tempDate.getUTCHours();
            this.minute = tempDate.getUTCMinutes();
            this.second = tempDate.getUTCSeconds();
            this.millisecond = tempDate.getUTCMilliseconds();
        }
        //endregion
    }

    /**
	 * Function converting ASN.1 internal class into JavaScript string
	 * @returns {string}
	 */
    toString() {
        const outputArray = [];

        outputArray.push(util.padNumber(this.year, 4));
        outputArray.push(util.padNumber(this.month, 2));
        outputArray.push(util.padNumber(this.day, 2));
        outputArray.push(util.padNumber(this.hour, 2));
        outputArray.push(util.padNumber(this.minute, 2));
        outputArray.push(util.padNumber(this.second, 2));
        if (this.millisecond !== 0) {
            outputArray.push(".");
            outputArray.push(util.padNumber(this.millisecond, 3));
        }
        outputArray.push("Z");

        return outputArray.join("");
    }

    /**
	 * Aux function, need to get a block name. Need to have it here for inhiritence
	 * @returns {string}
	 */
    static blockName() {
        return "GeneralizedTime";
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
        object.millisecond = this.millisecond;

        return object;
    }
}
