const {
    is,
    orm
} = adone;

const {
    x
} = orm;

export default class Association {
    constructor(source, target, options) {
        options = options || {};
        this.source = source;
        this.target = target;
        this.options = options;
        this.scope = options.scope;
        this.isSelfAssociation = this.source === this.target;
        this.as = options.as;
        /**
         * @type {"HasMany" | "BelongsTo" | "HasOne" | "BelongsToMany"}
         */
        this.associationType = "";

        if (source.hasAlias(options.as)) {
            throw new x.AssociationError(`You have used the alias ${options.as} in two separate associations. Aliased associations must have unique aliases.`);
        }
    }
    // Normalize input - may be array or single obj, instance or primary key - convert it to an array of built objects
    toInstanceArray(objs) {
        if (!is.array(objs)) {
            objs = [objs];
        }
        return objs.map(function (obj) {
            if (!(obj instanceof this.target)) {
                const tmpInstance = {};
                tmpInstance[this.target.primaryKeyAttribute] = obj;
                return this.target.build(tmpInstance, {
                    isNewRecord: false
                });
            }
            return obj;
        }, this);
    }
    inspect() {
        return this.as;
    }
}