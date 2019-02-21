/**
 * A collection of properties related to deferrable constraints. It can be used to
 * make foreign key constraints deferrable and to set the constraints within a
 * transaction. This is only supported in PostgreSQL.
 */
class ABSTRACT {
    toString(...args) {
        return this.toSql(...args);
    }

    static toString(...args) {
        return new this().toString(...args);
    }
}


export class INITIALLY_DEFERRED extends ABSTRACT {
    toSql() {
        return "DEFERRABLE INITIALLY DEFERRED";
    }
}


export class INITIALLY_IMMEDIATE extends ABSTRACT {
    toSql() {
        return "DEFERRABLE INITIALLY IMMEDIATE";
    }
}

export class NOT extends ABSTRACT {
    toSql() {
        return "NOT DEFERRABLE";
    }
}

export class SET_DEFERRED extends ABSTRACT {
    constructor(constraints) {
        super();
        this.constraints = constraints;
    }

    toSql(queryGenerator) {
        return queryGenerator.setDeferredQuery(this.constraints);
    }
}

export class SET_IMMEDIATE extends ABSTRACT {
    constructor(constraints) {
        super();
        this.constraints = constraints;
    }

    toSql(queryGenerator) {
        return queryGenerator.setImmediateQuery(this.constraints);
    }
}
