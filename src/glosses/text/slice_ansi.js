const {
    is,
    cli: { esc }
} = adone;

const CSI_CODES = [
    "\u001b",
    "\u009b"
];

const SGR_CLOSE_CODES = [];
esc.codes.forEach((value) => SGR_CLOSE_CODES.push(value.toString()));

const surrogatePairRegex = new RegExp(`^${"[\uD800-\uDBFF][\uDC00-\uDFFF]"}$`);

const extractSgrCode = (sgrParameter) => /^\d+/.exec(sgrParameter).toString();

const findSgrCloseParameter = (sgrParameter) => {
    const sgrCode = extractSgrCode(sgrParameter);
    let closeSgrParameter;
    if (sgrCode === "38") {
        closeSgrParameter = "39";
    } else if (sgrCode === "48") {
        closeSgrParameter = "49";
    } else {
        closeSgrParameter = esc.codes.get(Number(sgrCode)).toString();
    }
    if (!is.string(closeSgrParameter)) {
        throw new Error("Can not find SGR code to close");
    }
    return closeSgrParameter;
};

const findAndOffsetEffectingSgrParameter = (effectingSgrParameters, closeSgrParameter) => {
    const newList = [];

    // Reset
    if (closeSgrParameter === "0") {
        return newList;
    }

    for (let i = effectingSgrParameters.length - 1; i >= 0; i -= 1) {
        const sgrParameter = effectingSgrParameters[i];
        if (findSgrCloseParameter(sgrParameter) !== closeSgrParameter) {
            newList.unshift(sgrParameter);
        }
    }

    return newList;
};

const wrapToAnsi = (sgrParameter) => `${CSI_CODES[0]}[${sgrParameter}m`;

const appendAnsiOutput = (output, ansi) => {
    // NOTE: Does not erase to leave the tag structure.
    //// Does not put two identical ANSI escape codes at the end.
    //if (output.indexOf(ansi) === output.length - ansi.length) {
    //  return output;
    //}
    return output + ansi;
};

/**
 * @param str {string}
 * @param begin {number}
 * @param end {(number|null|undefined)}
 */
export default (str, begin, end, { term = false } = {}) => {
    const characters = Array.from(str.normalize());
    const actualEnd = is.nil(end) ? characters.length : end;

    let insideAnsi = false; // Is the `character` inside of ANSI escape code?
    let effectingSgrParameters = [];
    let visibleCharacterIndex = -1;
    let output = "";

    for (const item of characters.entries()) {
        if (visibleCharacterIndex >= actualEnd - 1) {
            break;
        }

        const [
            characterIndex,
            character
        ] = item;

        let leftAnsi = false; // Does the `character` left from ANSI escape code at this loop?

        if (CSI_CODES.includes(character)) {
            insideAnsi = true;

            // If ANSI escape code is 256 colors, it will be 11 characters long. ex) "\u001b[38;5;255m"
            const strIncludedSgrParameter = characters.slice(characterIndex, characterIndex + 11).join("");
            const sgrParameter = /\d[^m]*/.exec(strIncludedSgrParameter).toString();
            const sgrCode = extractSgrCode(sgrParameter);
            if (SGR_CLOSE_CODES.includes(sgrCode)) {
                effectingSgrParameters = findAndOffsetEffectingSgrParameter(effectingSgrParameters, sgrCode);
            } else {
                effectingSgrParameters.push(sgrParameter);
            }
            if (output !== "") {
                output = appendAnsiOutput(output, wrapToAnsi(sgrParameter));
            }
        } else if (insideAnsi && character === "m") {
            insideAnsi = false;
            leftAnsi = true;
        }

        if (!insideAnsi && !leftAnsi) {
            ++visibleCharacterIndex;

            if (term && !surrogatePairRegex.test(character) && adone.text.unicode.isFullWidthCodePoint(character.codePointAt())) {
                ++visibleCharacterIndex;
            }

            if (visibleCharacterIndex >= begin && visibleCharacterIndex < actualEnd) {
                // Add effecting ANSI escape codes.
                if (output === "") {
                    effectingSgrParameters.forEach((v) => {
                        output = appendAnsiOutput(output, wrapToAnsi(v));
                    });
                }
                output += character;
            }
        }
    }

    // Close ANSI escape if escape is ongoing.
    if (output !== "") {
        effectingSgrParameters.slice().reverse().forEach((sgrParameter) => {
            const closeSgrParameter = findSgrCloseParameter(sgrParameter);
            output = appendAnsiOutput(output, wrapToAnsi(closeSgrParameter));
        });
    }

    return output;
};
