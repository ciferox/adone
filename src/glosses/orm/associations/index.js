const Association = require("./base");
Association.BelongsTo = require("./belongs_to");
Association.HasOne = require("./has_one");
Association.HasMany = require("./has_many");
Association.BelongsToMany = require("./belongs_to_many");

module.exports = Association;
module.exports.default = Association;
module.exports.Association = Association;
