

function id(e) {
    return e; 
}
const prop = require("../util/prop");
const filter = require("./filter");

//drop items you have already seen.
module.exports = function unique(field, invert) {
    field = prop(field) || id;
    const seen = {};
    return filter((data) => {
        const key = field(data);
        if (seen[key]) {
            return Boolean(invert); 
        } //false, by default
        seen[key] = true;
        return !invert; //true by default
    });
};

