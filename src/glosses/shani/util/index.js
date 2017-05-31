const { lazify } = adone;

lazify({
    __: "./__",
    assert: "./assert",
    expectation: "./expectation",
    match: "./match",
    mock: "./mock",
    sandbox: "./sandbox",
    spy: "./spy",
    stub: "./stub",
    nock: "./nock",
    request: "./request",
    FS: "./fs"
}, exports, require);
