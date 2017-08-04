const native = adone.bind("git.node");

const Packbuilder = native.Packbuilder;

Packbuilder.STAGE = {
    ADDING_OBJECTS: 0,
    DELTAFICATION: 1
};

export default Packbuilder;

