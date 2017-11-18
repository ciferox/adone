const mongoose = adone.odm;

describe("parseOptions", () => {
    it("should not mutate user passed options map", () => {
        const db = new mongoose.Connection();
        const now = Date.now();

        const userPassedOptionsMap = Object.create(null, {
            auth: {
                value: {},
                enumerable: true
            },
            prop_num: {
                value: now,
                enumerable: true
            },
            prop_obj: {
                value: {},
                enumerable: true
            }
        });
        let ultimateOptionsMap;

        ultimateOptionsMap = db.parseOptions(userPassedOptionsMap);

        assert.notEqual(ultimateOptionsMap, userPassedOptionsMap);
        assert.deepStrictEqual(userPassedOptionsMap, Object.create(null, {
            auth: {
                value: {},
                enumerable: true
            },
            prop_num: {
                value: now,
                enumerable: true
            },
            prop_obj: {
                value: {},
                enumerable: true
            }
        }));
        assert.notDeepEqual(ultimateOptionsMap, Object.create(null, {
            auth: {
                value: {},
                enumerable: true
            },
            prop_num: {
                value: now,
                enumerable: true
            },
            prop_obj: {
                value: {},
                enumerable: true
            }
        }));
    });
});
