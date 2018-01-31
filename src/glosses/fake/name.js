const {
    is,
    fake
} = adone;

/**
 * firstName
 *
 * @method firstName
 * @param {mixed} gender
 * @memberof fake.name
 */
export const firstName = function (gender) {
    if (!is.undefined(fake.definitions.name.male_first_name) && !is.undefined(fake.definitions.name.female_first_name)) {
        // some locale datasets ( like ru ) have first_name split by gender. since the name.first_name field does not exist in these datasets,
        // we must randomly pick a name from either gender array so fake.name.firstName will return the correct locale data ( and not fallback )
        if (!is.number(gender)) {
            if (is.undefined(fake.definitions.name.first_name)) {
                gender = fake.random.number(1);
            } else {
                //Fall back to non-gendered names if they exist and gender wasn't specified
                return fake.random.arrayElement(fake.definitions.name.first_name);
            }
        }
        if (gender === 0) {
            return fake.random.arrayElement(fake.definitions.name.male_first_name);
        }
        return fake.random.arrayElement(fake.definitions.name.female_first_name);

    }
    return fake.random.arrayElement(fake.definitions.name.first_name);
};

/**
 * lastName
 *
 * @method lastName
 * @param {mixed} gender
 * @memberof fake.name
 */
export const lastName = function (gender) {
    if (!is.undefined(fake.definitions.name.male_last_name) && !is.undefined(fake.definitions.name.female_last_name)) {
        // some locale datasets ( like ru ) have last_name split by gender. i have no idea how last names can have genders, but also i do not speak russian
        // see above comment of firstName method
        if (!is.number(gender)) {
            gender = fake.random.number(1);
        }
        if (gender === 0) {
            return fake.random.arrayElement(fake.locales[fake.getLocale()].name.male_last_name);
        }
        return fake.random.arrayElement(fake.locales[fake.getLocale()].name.female_last_name);

    }
    return fake.random.arrayElement(fake.definitions.name.last_name);
};

/**
 * findName
 *
 * @method findName
 * @param {string} firstName
 * @param {string} lastName
 * @param {mixed} gender
 * @memberof fake.name
 */
export const findName = function (firstName, lastName, gender) {
    const r = fake.random.number(8);
    let prefix;
    let suffix;
    // in particular locales first and last names split by gender,
    // thus we keep consistency by passing 0 as male and 1 as female
    if (!is.number(gender)) {
        gender = fake.random.number(1);
    }
    firstName = firstName || fake.name.firstName(gender);
    lastName = lastName || fake.name.lastName(gender);
    switch (r) {
        case 0:
            prefix = fake.name.prefix(gender);
            if (prefix) {
                return `${prefix} ${firstName} ${lastName}`;
            }
        case 1:
            suffix = fake.name.suffix(gender);
            if (suffix) {
                return `${firstName} ${lastName} ${suffix}`;
            }
    }

    return `${firstName} ${lastName}`;
};

/**
 * jobTitle
 *
 * @method jobTitle
 * @memberof fake.name
 */
export const jobTitle = function () {
    return `${fake.name.jobDescriptor()} ${
        fake.name.jobArea()} ${
        fake.name.jobType()}`;
};

/**
 * gender
 *
 * @method gender
 * @memberof fake.name
 */
export const gender = function () {
    return fake.random.arrayElement(fake.definitions.name.gender);
};

/**
 * prefix
 *
 * @method prefix
 * @param {mixed} gender
 * @memberof fake.name
 */
export const prefix = function (gender) {
    if (!is.undefined(fake.definitions.name.male_prefix) && !is.undefined(fake.definitions.name.female_prefix)) {
        if (!is.number(gender)) {
            gender = fake.random.number(1);
        }
        if (gender === 0) {
            return fake.random.arrayElement(fake.locales[fake.getLocale()].name.male_prefix);
        }
        return fake.random.arrayElement(fake.locales[fake.getLocale()].name.female_prefix);

    }
    return fake.random.arrayElement(fake.definitions.name.prefix);
};

/**
 * suffix
 *
 * @method suffix
 * @memberof fake.name
 */
export const suffix = function () {
    return fake.random.arrayElement(fake.definitions.name.suffix);
};

/**
 * title
 *
 * @method title
 * @memberof fake.name
 */
export const title = function () {
    const descriptor = fake.random.arrayElement(fake.definitions.name.title.descriptor);
    const level = fake.random.arrayElement(fake.definitions.name.title.level);
    const job = fake.random.arrayElement(fake.definitions.name.title.job);

    return `${descriptor} ${level} ${job}`;
};

/**
 * jobDescriptor
 *
 * @method jobDescriptor
 * @memberof fake.name
 */
export const jobDescriptor = function () {
    return fake.random.arrayElement(fake.definitions.name.title.descriptor);
};

/**
 * jobArea
 *
 * @method jobArea
 * @memberof fake.name
 */
export const jobArea = function () {
    return fake.random.arrayElement(fake.definitions.name.title.level);
};

/**
 * jobType
 *
 * @method jobType
 * @memberof fake.name
 */
export const jobType = function () {
    return fake.random.arrayElement(fake.definitions.name.title.job);
};
