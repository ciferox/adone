export class AbstractType {
    constructor(name) {
        this.type = name;
    }
}

adone.lazify({
    UndefinedType: "./undefined",
    NullType: "./null",
    PrimitiveType: "./primitive",
    ReferenceType: "./reference",
    ObjectType: "./object"
}, exports, require);
