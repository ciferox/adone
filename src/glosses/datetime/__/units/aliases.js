const { is } = adone;

const aliases = {};

export const addUnitAlias = (unit, shorthand) => {
    const lowerCase = unit.toLowerCase();
    aliases[lowerCase] = aliases[`${lowerCase}s`] = aliases[shorthand] = unit;
};

export const normalizeUnits = (units) => {
    return is.string(units) ? aliases[units] || aliases[units.toLowerCase()] : undefined;
};

export const normalizeObjectUnits = (inputObject) => {
    const normalizedInput = {};

    for (const prop in inputObject) {
        if (is.propertyOwned(inputObject, prop)) {
            const normalizedProp = normalizeUnits(prop);
            if (normalizedProp) {
                normalizedInput[normalizedProp] = inputObject[prop];
            }
        }
    }
    return normalizedInput;
};
