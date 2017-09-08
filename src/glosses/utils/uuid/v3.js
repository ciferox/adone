const { util: { uuid } } = adone;

const __ = adone.private(uuid);

const v3 = __.v35("v3", 0x30, __.md5);

export default v3;
