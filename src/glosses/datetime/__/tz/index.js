const { is } = adone;

export const zones = {};
export const links = {};
export const names = {};

let moveInvalidForward = true;
let moveAmbiguousForward = false;

export const setMoveInvalidForward = (val) => {
    moveInvalidForward = val;
};

export const getMoveInvalidForward = () => moveInvalidForward;

export const setMoveAmbiguousForward = (val) => {
    moveAmbiguousForward = val;
};

export const getMoveAmbiguousForward = () => moveAmbiguousForward;


// export let dataVersion = "";

const guesses = {};

let cachedGuess;

const normalizeName = (name) => {
    return (name || "").toLowerCase().replace(/\//g, "_");
};

const charCodeToInt = (charCode) => {
    if (charCode > 96) {
        return charCode - 87;
    } else if (charCode > 64) {
        return charCode - 29;
    }
    return charCode - 48;
};

export const unpackBase60 = (string) => {
    let i = 0;
    const parts = string.split(".");
    const whole = parts[0];
    const fractional = parts[1] || "";
    let multiplier = 1;
    let num;
    let out = 0;
    let sign = 1;

    // handle negative numbers
    if (string.charCodeAt(0) === 45) {
        i = 1;
        sign = -1;
    }

    // handle digits before the decimal
    for (i; i < whole.length; i++) {
        num = charCodeToInt(whole.charCodeAt(i));
        out = 60 * out + num;
    }

    // handle digits after the decimal
    for (i = 0; i < fractional.length; i++) {
        multiplier = multiplier / 60;
        num = charCodeToInt(fractional.charCodeAt(i));
        out += num * multiplier;
    }

    return out * sign;
};

const arrayToInt = (array) => {
    for (let i = 0; i < array.length; i++) {
        array[i] = unpackBase60(array[i]);
    }
};

const addToGuesses = (name, offsets) => {
    let i;
    let offset;
    arrayToInt(offsets);
    for (i = 0; i < offsets.length; i++) {
        offset = offsets[i];
        guesses[offset] = guesses[offset] || {};
        guesses[offset][name] = true;
    }
};


export const addZone = (packed) => {
    let i;
    let name;
    let split;
    let normalized;

    if (is.string(packed)) {
        packed = [packed];
    }

    for (i = 0; i < packed.length; i++) {
        split = packed[i].split("|");
        name = split[0];
        normalized = normalizeName(name);
        zones[normalized] = packed[i];
        names[normalized] = name;
        addToGuesses(normalized, split[2].split(" "));
    }
};

export const addLink = (aliases) => {
    let i;
    let alias;
    let normal0;
    let normal1;

    if (is.string(aliases)) {
        aliases = [aliases];
    }

    for (i = 0; i < aliases.length; i++) {
        alias = aliases[i].split("|");

        normal0 = normalizeName(alias[0]);
        normal1 = normalizeName(alias[1]);

        links[normal0] = normal1;
        names[normal0] = alias[0];

        links[normal1] = normal0;
        names[normal1] = alias[1];
    }
};


export const loadData = (data) => {
    addZone(data.zones);
    addLink(data.links);
    // dataVersion = data.version;
};

const mapIndices = (source, indices) => {
    const out = [];
    let i;

    for (i = 0; i < indices.length; i++) {
        out[i] = source[indices[i]];
    }

    return out;
};

const intToUntil = (array, length) => {
    for (let i = 0; i < length; i++) {
        array[i] = Math.round((array[i - 1] || 0) + (array[i] * 60000)); // minutes to milliseconds
    }

    array[length - 1] = Infinity;
};

export const unpack = (string) => {
    const data = string.split("|");
    const offsets = data[2].split(" ");
    const indices = data[3].split("");
    const untils = data[4].split(" ");

    arrayToInt(offsets);
    arrayToInt(indices);
    arrayToInt(untils);

    intToUntil(untils, indices.length);

    return {
        name: data[0],
        abbrs: mapIndices(data[1].split(" "), indices),
        offsets: mapIndices(offsets, indices),
        untils,
        population: data[5] | 0
    };
};

export class Zone {
    constructor(packedString) {
        if (packedString) {
            this._set(unpack(packedString));
        }
    }

    _set(unpacked) {
        this.name = unpacked.name;
        this.abbrs = unpacked.abbrs;
        this.untils = unpacked.untils;
        this.offsets = unpacked.offsets;
        this.population = unpacked.population;
    }

    _index(timestamp) {
        const target = Number(timestamp);
        const untils = this.untils;
        let i;

        for (i = 0; i < untils.length; i++) {
            if (target < untils[i]) {
                return i;
            }
        }
    }

    parse(timestamp) {
        const target = Number(timestamp);
        const offsets = this.offsets;
        const untils = this.untils;
        const max = untils.length - 1;
        let offset;
        let offsetNext;
        let offsetPrev;
        let i;

        for (i = 0; i < max; i++) {
            offset = offsets[i];
            offsetNext = offsets[i + 1];
            offsetPrev = offsets[i ? i - 1 : i];

            if (offset < offsetNext && moveAmbiguousForward) {
                offset = offsetNext;
            } else if (offset > offsetPrev && moveInvalidForward) {
                offset = offsetPrev;
            }

            if (target < untils[i] - (offset * 60000)) {
                return offsets[i];
            }
        }

        return offsets[max];
    }

    abbr(mom) {
        return this.abbrs[this._index(mom)];
    }

    offset(mom) {
        adone.logError("zone.offset has been deprecated in favor of zone.utcOffset");
        return this.offsets[this._index(mom)];
    }

    utcOffset(mom) {
        return this.offsets[this._index(mom)];
    }
}

export const getZone = (name, caller) => {
    name = normalizeName(name);

    let zone = zones[name];
    let link;

    if (zone instanceof Zone) {
        return zone;
    }

    if (is.string(zone)) {
        zone = new Zone(zone);
        zones[name] = zone;
        return zone;
    }

    // Pass getZone to prevent recursion more than 1 level deep
    if (links[name] && caller !== getZone && (link = getZone(links[name], getZone))) {
        zone = zones[name] = new Zone();
        zone._set(link);
        zone.name = names[name];
        return zone;
    }

    return null;
};


export const zoneExists = (name) => {
    return Boolean(getZone(name));
};

class ZoneScore {
    constructor(zone) {
        this.zone = zone;
        this.offsetScore = 0;
        this.abbrScore = 0;
    }

    scoreOffsetAt(offsetAt) {
        this.offsetScore += Math.abs(this.zone.utcOffset(offsetAt.at) - offsetAt.offset);
        if (this.zone.abbr(offsetAt.at).replace(/[^A-Z]/g, "") !== offsetAt.abbr) {
            this.abbrScore++;
        }
    }
}

class OffsetAt {
    constructor(at) {
        const timeString = at.toTimeString();
        let abbr = timeString.match(/\([a-z ]+\)/i);
        if (abbr && abbr[0]) {
            // 17:56:31 GMT-0600 (CST)
            // 17:56:31 GMT-0600 (Central Standard Time)
            abbr = abbr[0].match(/[A-Z]/g);
            abbr = abbr ? abbr.join("") : undefined;
        } else {
            // 17:56:31 CST
            // 17:56:31 GMT+0800 (台北標準時間)
            abbr = timeString.match(/[A-Z]{3,5}/g);
            abbr = abbr ? abbr[0] : undefined;
        }

        if (abbr === "GMT") {
            abbr = undefined;
        }

        this.at = Number(at);
        this.abbr = abbr;
        this.offset = at.getTimezoneOffset();
    }
}

const findChange = (low, high) => {
    let mid;
    let diff;

    while ((diff = ((high.at - low.at) / 12e4 | 0) * 6e4)) {
        mid = new OffsetAt(new Date(low.at + diff));
        if (mid.offset === low.offset) {
            low = mid;
        } else {
            high = mid;
        }
    }

    return low;
};

const userOffsets = () => {
    const startYear = new Date().getFullYear() - 2;
    let last = new OffsetAt(new Date(startYear, 0, 1));
    const offsets = [last];
    let change;
    let next;
    let i;

    for (i = 1; i < 48; i++) {
        next = new OffsetAt(new Date(startYear, i, 1));
        if (next.offset !== last.offset) {
            change = findChange(last, next);
            offsets.push(change);
            offsets.push(new OffsetAt(new Date(change.at + 6e4)));
        }
        last = next;
    }

    for (i = 0; i < 4; i++) {
        offsets.push(new OffsetAt(new Date(startYear + i, 0, 1)));
        offsets.push(new OffsetAt(new Date(startYear + i, 6, 1)));
    }

    return offsets;
};

const guessesForUserOffsets = (offsets) => {
    const offsetsLength = offsets.length;
    const filteredGuesses = {};
    const out = [];
    let i;
    let j;
    let guessesOffset;

    for (i = 0; i < offsetsLength; i++) {
        guessesOffset = guesses[offsets[i].offset] || {};
        for (j in guessesOffset) {
            if (guessesOffset.hasOwnProperty(j)) {
                filteredGuesses[j] = true;
            }
        }
    }

    for (i in filteredGuesses) {
        if (filteredGuesses.hasOwnProperty(i)) {
            out.push(names[i]);
        }
    }

    return out;
};

const sortZoneScores = (a, b) => {
    if (a.offsetScore !== b.offsetScore) {
        return a.offsetScore - b.offsetScore;
    }
    if (a.abbrScore !== b.abbrScore) {
        return a.abbrScore - b.abbrScore;
    }
    return b.zone.population - a.zone.population;
};

const rebuildGuess = () => {

    // use Intl API when available and returning valid time zone
    try {
        const intlName = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (intlName && intlName.length > 3) {
            const name = names[normalizeName(intlName)];
            if (name) {
                return name;
            }
            adone.logError(`timezone found ${intlName} from the Intl api, but did not have that data loaded.`);
        }
    } catch (e) {
        // Intl unavailable, fall back to manual guessing.
    }

    const offsets = userOffsets();
    const offsetsLength = offsets.length;
    const guesses = guessesForUserOffsets(offsets);
    const zoneScores = [];
    let zoneScore;
    let i;
    let j;

    for (i = 0; i < guesses.length; i++) {
        zoneScore = new ZoneScore(getZone(guesses[i]), offsetsLength);
        for (j = 0; j < offsetsLength; j++) {
            zoneScore.scoreOffsetAt(offsets[j]);
        }
        zoneScores.push(zoneScore);
    }

    zoneScores.sort(sortZoneScores);

    return zoneScores.length > 0 ? zoneScores[0].zone.name : undefined;
};

export const guess = (ignoreCache) => {
    if (!cachedGuess || ignoreCache) {
        cachedGuess = rebuildGuess();
    }
    return cachedGuess;
};

export const getNames = () => {
    let i;
    const out = [];

    for (i in names) {
        if (names.hasOwnProperty(i) && (zones[i] || zones[links[i]]) && names[i]) {
            out.push(names[i]);
        }
    }

    return out.sort();
};

export const needsOffset = (m) => {
    const isUnixTimestamp = (m._f === "X" || m._f === "x");
    return Boolean(m._a && (is.undefined(m._tzm)) && !isUnixTimestamp);
};

export const reload = () => {
    loadData(require("./latest.json"));
};

reload();
