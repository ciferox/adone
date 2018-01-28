/**
 * Operator symbols to be used when querying data
 */
const operators = {
    eq: Symbol.for("eq"),
    ne: Symbol.for("ne"),
    gte: Symbol.for("gte"),
    gt: Symbol.for("gt"),
    lte: Symbol.for("lte"),
    lt: Symbol.for("lt"),
    not: Symbol.for("not"),
    is: Symbol.for("is"),
    in: Symbol.for("in"),
    notIn: Symbol.for("notIn"),
    like: Symbol.for("like"),
    notLike: Symbol.for("notLike"),
    iLike: Symbol.for("iLike"),
    notILike: Symbol.for("notILike"),
    regexp: Symbol.for("regexp"),
    notRegexp: Symbol.for("notRegexp"),
    iRegexp: Symbol.for("iRegexp"),
    notIRegexp: Symbol.for("notIRegexp"),
    between: Symbol.for("between"),
    notBetween: Symbol.for("notBetween"),
    overlap: Symbol.for("overlap"),
    contains: Symbol.for("contains"),
    contained: Symbol.for("contained"),
    adjacent: Symbol.for("adjacent"),
    strictLeft: Symbol.for("strictLeft"),
    strictRight: Symbol.for("strictRight"),
    noExtendRight: Symbol.for("noExtendRight"),
    noExtendLeft: Symbol.for("noExtendLeft"),
    and: Symbol.for("and"),
    or: Symbol.for("or"),
    any: Symbol.for("any"),
    all: Symbol.for("all"),
    values: Symbol.for("values"),
    col: Symbol.for("col"),
    placeholder: Symbol.for("placeholder"),
    join: Symbol.for("join"),
    raw: Symbol.for("raw") // deprecated remove by v5.0
};

const Aliases = {
    $eq: operators.eq,
    $ne: operators.ne,
    $gte: operators.gte,
    $gt: operators.gt,
    $lte: operators.lte,
    $lt: operators.lt,
    $not: operators.not,
    $in: operators.in,
    $notIn: operators.notIn,
    $is: operators.is,
    $like: operators.like,
    $notLike: operators.notLike,
    $iLike: operators.iLike,
    $notILike: operators.notILike,
    $regexp: operators.regexp,
    $notRegexp: operators.notRegexp,
    $iRegexp: operators.iRegexp,
    $notIRegexp: operators.notIRegexp,
    $between: operators.between,
    $notBetween: operators.notBetween,
    $overlap: operators.overlap,
    $contains: operators.contains,
    $contained: operators.contained,
    $adjacent: operators.adjacent,
    $strictLeft: operators.strictLeft,
    $strictRight: operators.strictRight,
    $noExtendRight: operators.noExtendRight,
    $noExtendLeft: operators.noExtendLeft,
    $and: operators.and,
    $or: operators.or,
    $any: operators.any,
    $all: operators.all,
    $values: operators.values,
    $col: operators.col,
    $raw: operators.raw // deprecated remove by v5.0
};

const LegacyAliases = { // deprecated remove by v5.0
    ne: operators.ne,
    not: operators.not,
    in: operators.in,
    notIn: operators.notIn,
    gte: operators.gte,
    gt: operators.gt,
    lte: operators.lte,
    lt: operators.lt,
    like: operators.like,
    ilike: operators.iLike,
    $ilike: operators.iLike,
    nlike: operators.notLike,
    $notlike: operators.notLike,
    notilike: operators.notILike,
    "..": operators.between,
    between: operators.between,
    "!..": operators.notBetween,
    notbetween: operators.notBetween,
    nbetween: operators.notBetween,
    overlap: operators.overlap,
    "&&": operators.overlap,
    "@>": operators.contains,
    "<@": operators.contained
};

operators.Aliases = Aliases;
operators.LegacyAliases = Object.assign({}, LegacyAliases, Aliases);

export default operators;
