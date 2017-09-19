const { is } = adone;
const __ = adone.private(adone.datetime);

const {
    format: { addFormatToken },
    parse: {
        addRegexToken,
        addParseToken,
        matchShortOffset
    },
    util: {
        hooks,
        toInt
    }
} = __;

// FORMATTING

const offset = (token, separator) => {
    addFormatToken(token, 0, 0, function () {
        let offset = this.utcOffset();
        let sign = "+";
        if (offset < 0) {
            offset = -offset;
            sign = "-";
        }
        return sign + String(~~(offset / 60)).padStart(2, "0") + separator + String(~~(offset) % 60).padStart(2, "0");
    });
};

offset("Z", ":");
offset("ZZ", "");

// timezone chunker
// '+10:00' > ['10',  '00']
// '-1530'  > ['-15', '30']
const chunkOffset = /([\+\-]|\d\d)/gi;

export const offsetFromString = (matcher, string) => {
    const matches = (string || "").match(matcher);

    if (is.null(matches)) {
        return null;
    }

    const chunk = matches[matches.length - 1] || [];
    const parts = (`${chunk}`).match(chunkOffset) || ["-", 0, 0];
    const minutes = Number(parts[1] * 60) + toInt(parts[2]);

    return minutes === 0 ?
        0 :
        parts[0] === "+" ? minutes : -minutes;
};

addRegexToken("Z", matchShortOffset);
addRegexToken("ZZ", matchShortOffset);
addParseToken(["Z", "ZZ"], (input, array, config) => {
    config._useUTC = true;
    config._tzm = offsetFromString(matchShortOffset, input);
});

// Return an ExDate from input, that is local/utc/zone equivalent to model.
export const cloneWithOffset = (input, model) => {
    let res;
    let diff;
    if (model._isUTC) {
        res = model.clone();
        diff = (is.datetime(input) || is.date(input) ? input.valueOf() : __.create.createLocal(input).valueOf()) - res.valueOf();
        // Use low-level api, because this fn is low-level api.
        res._d.setTime(res._d.valueOf() + diff);
        hooks.updateOffset(res, false);
        return res;
    }
    return __.create.createLocal(input).local();

};

// HOOKS

// This function will be called whenever an ExDate is mutated.
// It is intended to keep the offset in sync with the timezone.
hooks.updateOffset = function () {};
