const { is, shani: { util: { __ } } } = adone;

const restorable = Symbol.for("shani:restorable");

const isRestorable = (obj) => is.function(obj) && is.function(obj.restore) && obj.restore[restorable];

export default function restore(object) {
    if (!is.null(object) && is.plainObject(object)) {
        __.util.walk(object, (prop) => {
            if (isRestorable(object[prop])) {
                object[prop].restore();
            }
        });
    } else if (isRestorable(object)) {
        object.restore();
    }
}
