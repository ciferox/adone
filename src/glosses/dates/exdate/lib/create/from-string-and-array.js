
import { copyConfig } from "../exdate";
import { configFromStringAndFormat } from "./from-string-and-format";
import getParsingFlags from "./parsing-flags";
import { isValid } from "./valid";

const { extend } = adone.vendor.lodash;

// date from string and array of format strings
export function configFromStringAndArray(config) {

    if (config._f.length === 0) {
        getParsingFlags(config).invalidFormat = true;
        config._d = new Date(NaN);
        return;
    }

    let tempConfig;
    let bestExDate;
    let scoreToBeat;

    for (let i = 0; i < config._f.length; i++) {
        let currentScore = 0;
        tempConfig = copyConfig({}, config);
        if (adone.is.exist(config._useUTC)) {
            tempConfig._useUTC = config._useUTC;
        }
        tempConfig._f = config._f[i];
        configFromStringAndFormat(tempConfig);

        if (!isValid(tempConfig)) {
            continue;
        }

        // if there is any input that was not parsed add a penalty for that format
        currentScore += getParsingFlags(tempConfig).charsLeftOver;

        //or tokens
        currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

        getParsingFlags(tempConfig).score = currentScore;

        if (adone.is.nil(scoreToBeat) || currentScore < scoreToBeat) {
            scoreToBeat = currentScore;
            bestExDate = tempConfig;
        }
    }

    extend(config, bestExDate || tempConfig);
}
