const {
    fake
} = adone;

/**
 * column
 *
 * @method fake.database.column
 */
export const column = function () {
    return fake.random.arrayElement(fake.definitions.database.column);
};

column.schema = {
    description: "Generates a column name.",
    sampleResults: ["id", "title", "createdAt"]
};

/**
 * type
 *
 * @method fake.database.type
 */
export const type = function () {
    return fake.random.arrayElement(fake.definitions.database.type);
};

type.schema = {
    description: "Generates a column type.",
    sampleResults: ["byte", "int", "varchar", "timestamp"]
};

/**
 * collation
 *
 * @method fake.database.collation
 */
export const collation = function () {
    return fake.random.arrayElement(fake.definitions.database.collation);
};

collation.schema = {
    description: "Generates a collation.",
    sampleResults: ["utf8_unicode_ci", "utf8_bin"]
};

/**
 * engine
 *
 * @method fake.database.engine
 */
export const engine = function () {
    return fake.random.arrayElement(fake.definitions.database.engine);
};

engine.schema = {
    description: "Generates a storage engine.",
    sampleResults: ["MyISAM", "InnoDB"]
};
