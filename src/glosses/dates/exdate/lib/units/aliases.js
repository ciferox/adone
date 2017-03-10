

const aliases = {};

export function addUnitAlias (unit, shorthand) {
    const lowerCase = unit.toLowerCase();
    aliases[lowerCase] = aliases[lowerCase + "s"] = aliases[shorthand] = unit;
}

export function normalizeUnits(units) {
    return adone.is.string(units) ? aliases[units] || aliases[units.toLowerCase()] : undefined;
}

export function normalizeObjectUnits(inputObject) {
    const normalizedInput = {};

    for (const prop in inputObject) {
        if (adone.is.propertyOwned(inputObject, prop)) {
            const normalizedProp = normalizeUnits(prop);
            if (normalizedProp) {
                normalizedInput[normalizedProp] = inputObject[prop];
            }
        }
    }

    return normalizedInput;
}
