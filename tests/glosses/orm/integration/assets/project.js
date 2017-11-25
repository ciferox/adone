module.exports = function (orm, type) {
    return orm.define(`Project${parseInt(Math.random() * 9999999999999999)}`, {
        name: type.STRING
    });
};
