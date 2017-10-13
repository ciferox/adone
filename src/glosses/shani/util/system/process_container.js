const {
    ADONE_ROOT_PATH,
    ADONE_REQUIRE_PATH
} = process.env;
delete process.env.ADONE_ROOT_PATH;
delete process.env.ADONE_REQUIRE_PATH;

require(ADONE_ROOT_PATH);
process.argv[1] = ADONE_REQUIRE_PATH;
adone.require(ADONE_REQUIRE_PATH);
