const { is } = adone;

export default function (factory) {
    if (!is.function(factory.create)) {
        throw new TypeError("factory.create must be a function");
    }

    if (!is.function(factory.destroy)) {
        throw new TypeError("factory.destroy must be a function");
    }

    if (
        !is.undefined(factory.validate) &&
        !is.function(factory.validate)
    ) {
        throw new TypeError("factory.validate must be a function");
    }
}
