import walk from "./walk";

const wrapped = Symbol.for("shani:mock:wrapped");

function isRestorable(obj) {
    return typeof obj === "function" && typeof obj.restore === "function" && obj.restore[wrapped];
}

export default function restore(object) {
    if (object !== null && typeof object === "object") {
        walk(object, function (prop) {
            if (isRestorable(object[prop])) {
                object[prop].restore();
            }
        });
    } else if (isRestorable(object)) {
        object.restore();
    }
}
