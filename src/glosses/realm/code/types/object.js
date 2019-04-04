const {
    realm: { code: { type: { ReferenceType } } }
} = adone;

export default class ObjectType extends ReferenceType {
    constructor() {
        super("object");

    }
}
