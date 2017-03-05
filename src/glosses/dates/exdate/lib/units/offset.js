import adone from "adone";
import { addFormatToken } from "../format";
import { addRegexToken, matchShortOffset, addParseToken } from "../parse";
import { createLocal } from "../create/local";
import { toInt, hooks } from "../utils";

const { is } = adone;
const { padStart } = adone.vendor.lodash;

// FORMATTING

function offset (token, separator) {
    addFormatToken(token, 0, 0, function () {
        let offset = this.utcOffset();
        let sign = "+";
        if (offset < 0) {
            offset = -offset;
            sign = "-";
        }
        return sign + padStart(~~(offset / 60), 2, "0") + separator + padStart(~~(offset) % 60, 2, "0");
    });
}

offset("Z", ":");
offset("ZZ", "");

// PARSING

addRegexToken("Z",  matchShortOffset);
addRegexToken("ZZ", matchShortOffset);
addParseToken(["Z", "ZZ"], function (input, array, config) {
    config._useUTC = true;
    config._tzm = offsetFromString(matchShortOffset, input);
});

// HELPERS

// timezone chunker
// '+10:00' > ['10',  '00']
// '-1530'  > ['-15', '30']
const chunkOffset = /([\+\-]|\d\d)/gi;

export function offsetFromString(matcher, string) {
    const matches = (string || "").match(matcher);

    if (matches === null) {
        return null;
    }

    const chunk   = matches[matches.length - 1] || [];
    const parts   = (chunk + "").match(chunkOffset) || ["-", 0, 0];
    const minutes = +(parts[1] * 60) + toInt(parts[2]);

    return minutes === 0 ?
      0 :
      parts[0] === "+" ? minutes : -minutes;
}

// Return an ExDate from input, that is local/utc/zone equivalent to model.
export function cloneWithOffset(input, model) {
    let res;
    let diff;
    if (model._isUTC) {
        res = model.clone();
        diff = (is.exdate(input) || is.date(input) ? input.valueOf() : createLocal(input).valueOf()) - res.valueOf();
        // Use low-level api, because this fn is low-level api.
        res._d.setTime(res._d.valueOf() + diff);
        hooks.updateOffset(res, false);
        return res;
    } else {
        return createLocal(input).local();
    }
}

// HOOKS

// This function will be called whenever an ExDate is mutated.
// It is intended to keep the offset in sync with the timezone.
hooks.updateOffset = function () {};
