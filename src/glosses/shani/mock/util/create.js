const DummyClass = function () {};

export default function create(proto) {
    DummyClass.prototype = proto;
    return new DummyClass();
}
