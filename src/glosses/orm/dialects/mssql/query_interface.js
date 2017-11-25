/**
  A wrapper that fixes MSSQL's inability to cleanly remove columns from existing tables if they have a default constraint.

  @param  {String} tableName     The name of the table.
  @param  {String} attributeName The name of the attribute that we want to remove.
  @param  {Object} options
  @param  {Boolean|Function} [options.logging] A function that logs the sql queries, or false for explicitly not logging these queries
 */
export const removeColumn = async function (tableName, attributeName, options) {
    options = Object.assign({ raw: true }, options || {});

    const findConstraintSql = this.QueryGenerator.getDefaultConstraintQuery(tableName, attributeName);
    let [results] = await this.sequelize.query(findConstraintSql, options);
    if (!results.length) {
        // No default constraint found -- we can cleanly remove the column
        return;
    }

    let dropConstraintSql = this.QueryGenerator.dropConstraintQuery(tableName, results[0].name);
    await this.sequelize.query(dropConstraintSql, options);

    const findForeignKeySql = this.QueryGenerator.getForeignKeyQuery(tableName, attributeName);
    [results] = await this.sequelize.query(findForeignKeySql, options);
    if (!results.length) {
        // No foreign key constraints found, so we can remove the column
        return;
    }

    const dropForeignKeySql = this.QueryGenerator.dropForeignKeyQuery(tableName, results[0].constraint_name);
    await this.sequelize.query(dropForeignKeySql, options);
    //Check if the current column is a primaryKey
    const primaryKeyConstraintSql = this.QueryGenerator.getPrimaryKeyConstraintQuery(tableName, attributeName);
    [results] = await this.sequelize.query(primaryKeyConstraintSql, options);
    if (!results.length) {
        return;
    }

    dropConstraintSql = this.QueryGenerator.dropConstraintQuery(tableName, results[0].constraintName);
    await this.sequelize.query(dropConstraintSql, options);

    const removeSql = this.QueryGenerator.removeColumnQuery(tableName, attributeName);
    return this.sequelize.query(removeSql, options);
};
