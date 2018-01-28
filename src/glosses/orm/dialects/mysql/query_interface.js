/**
 * Returns an object that treats MySQL's inabilities to do certain queries.
 *
 * @class QueryInterface
 * @static
 * @private
 */

const {
    vendor: { lodash: _ },
    orm
} = adone;

const {
    x: {
        UnknownConstraintError
    }
} = orm;

/**
 * A wrapper that fixes MySQL's inability to cleanly remove columns from existing tables if they have a foreign key constraint.
 *
 * @param  {String} tableName     The name of the table.
 * @param  {String} columnName    The name of the attribute that we want to remove.
 * @param  {Object} options
 */
export const removeColumn = async function (tableName, columnName, options) {
    options = options || {};

    const [results] = await this.sequelize.query(
        this.QueryGenerator.getForeignKeyQuery(tableName.tableName ? tableName : {
            tableName,
            schema: this.sequelize.config.database
        }, columnName),
        _.assign({ raw: true }, options)
    );

    // No foreign key constraints found, so we can remove the column
    if (results.length && results[0].constraint_name !== "PRIMARY") {
        await Promise.all(results.map((constraint) => this.sequelize.query(
            this.QueryGenerator.dropForeignKeyQuery(tableName, constraint.constraint_name),
            _.assign({ raw: true }, options)
        )));
    }

    return this.sequelize.query(
        this.QueryGenerator.removeColumnQuery(tableName, columnName),
        _.assign({ raw: true }, options)
    );
};


export const removeConstraint = async function (tableName, constraintName, options) {
    const sql = this.QueryGenerator.showConstraintsQuery(tableName.tableName ? tableName : {
        tableName,
        schema: this.sequelize.config.database
    }, constraintName);

    const [constraint] = await this.sequelize.query(sql, Object.assign({}, options, { type: this.sequelize.queryType.SHOWCONSTRAINTS }));

    let query;
    if (constraint && constraint.constraintType) {
        if (constraint.constraintType === "FOREIGN KEY") {
            query = this.QueryGenerator.dropForeignKeyQuery(tableName, constraintName);
        } else {
            query = this.QueryGenerator.removeIndexQuery(constraint.tableName, constraint.constraintName);
        }
    } else {
        throw new UnknownConstraintError(`Constraint ${constraintName} on table ${tableName} does not exist`);
    }

    return this.sequelize.query(query, options);
};
