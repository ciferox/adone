const {
    exception,
    schema: { __ }
} = adone;

export class MissingRef extends exception.Exception {
    constructor(baseId, ref, message) {
        super(message);
        this.message = message || MissingRef.message(baseId, ref);
        this.missingRef = __.resolve.url(baseId, ref);
        this.missingSchema = __.resolve.normalizeId(__.resolve.fullPath(this.missingRef));
    }

    static message(baseId, ref) {
        return `can't resolve reference ${ref} from id ${baseId}`;
    }
}

export class Validation extends exception.Exception {
    constructor(errors) {
        super("validation failed");
        this.errors = errors;
        this.validation = true;
    }
}
