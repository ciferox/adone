const { is } = adone;
const __ = adone.getPrivate(adone.datetime);

// date from string and array of format strings
export const configFromStringAndArray = (config) => {

    if (config._f.length === 0) {
        __.create.getParsingFlags(config).invalidFormat = true;
        config._d = new Date(NaN);
        return;
    }

    let tempConfig;
    let bestExDate;
    let scoreToBeat;

    for (let i = 0; i < config._f.length; i++) {
        let currentScore = 0;
        tempConfig = __.datetime.copyConfig({}, config);
        if (is.exist(config._useUTC)) {
            tempConfig._useUTC = config._useUTC;
        }
        tempConfig._f = config._f[i];
        __.create.configFromStringAndFormat(tempConfig);

        if (!__.create.isValid(tempConfig)) {
            continue;
        }

        const { getParsingFlags } = __.create;

        // if there is any input that was not parsed add a penalty for that format
        currentScore += getParsingFlags(tempConfig).charsLeftOver;

        //or tokens
        currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

        getParsingFlags(tempConfig).score = currentScore;

        if (is.nil(scoreToBeat) || currentScore < scoreToBeat) {
            scoreToBeat = currentScore;
            bestExDate = tempConfig;
        }
    }

    Object.assign(config, bestExDate || tempConfig);
};
