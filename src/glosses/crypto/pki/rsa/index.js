adone.lazify({
    generateKeyPair: "./generate_key_pair",
    createKeyPairGenerationState: "./create_key_pair_generation_state",
    stepKeyPairGenerationState: "./step_key_pair_generation_state",
    setPrivateKey: "./set_private_key",
    setPublicKey: "./set_public_key",
    decrypt: "./decrypt",
    encrypt: "./encrypt"
}, exports, require);

adone.lazifyp({
    decodePKCS1v15: "./__/decode_pkcs1v15",
    encodePKCS1v15: "./__/encode_pkcs1v15",
    emsaPKCS1v15encode: "./__/emsa_pkcs1v15_encode",
    modPow: "./__/mod_pow"
}, exports, require);
