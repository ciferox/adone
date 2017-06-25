describe("unicode", function () {
    const { util } = adone;
    const { enumerate } = util;

    it("should correctly save unicode containing document", async () => {
        const { db } = this;
        const doc = {
            statusesCount: 1687,
            createdAt: "Mon Oct 22 14:55:08 +0000 2007",
            description: "NodeJS hacker, Cofounder of Debuggable, CakePHP core alumnus",
            favouritesCount: 6,
            profileSidebarFillColor: "EADEAA",
            screenName: "felixge",
            status:
            {
                createdAt: "Fri Mar 12 08:59:44 +0000 2010",
                inReplyToScreenName: null,
                truncated: false,
                inReplyToUserId: null,
                source: '<a href="http://www.atebits.com/" rel="nofollow">Tweetie</a>',
                favorited: false,
                inReplyToStatusId: null,
                id: 10364119169,
                text: "#berlin #snow = #fail : ("
            },
            contributorsEnabled: false,
            following: null,
            geoEnabled: false,
            timeZone: "Eastern Time (US & Canada)",
            profileSidebarBorderColor: "D9B17E",
            url: "http://debuggable.com",
            verified: false,
            location: "Berlin",
            profileTextColor: "333333",
            notifications: null,
            profileBackgroundImageUrl: "http://s.twimg.com/a/1268354287/images/themes/theme8/bg.gif",
            protected: false,
            profileLinkColor: "9D582E",
            followersCount: 840,
            name: "Felix Geisend\u00f6rfer",
            profileBackgroundTile: false,
            id: 9599342,
            lang: "en",
            utcOffset: -18000,
            friendsCount: 450,
            profileBackgroundColor: "8B542B",
            profileImageUrl: "http://a3.twimg.com/profile_images/107142257/passbild-square_normal.jpg"
        };
        const collection = await db.createCollection("test_should_correctly_save_unicode_containing_document");
        doc._id = "felixge";
        await collection.save(doc, { w: 1 });
        expect(await collection.findOne()).to.be.deep.equal(doc);
    });

    it("should correctly insert unicode characters", async () => {
        const { db } = this;
        const collection = await db.createCollection("unicode_test_collection");
        const testStrings = ["ouooueauiOUOOUEAUI", "öüóőúéáűíÖÜÓŐÚÉÁŰÍ", "本荘由利地域に洪水警報", "хеллоу ворлд"];
        for (const [idx, s] of enumerate(testStrings)) {
            await collection.insert({ id: idx, text: s }, { w: 1 });
        }
        const items = await collection.find().toArray();
        expect(items).to.have.lengthOf(testStrings.length);
        for (const item of items) {
            expect(item.text).to.be.equal(testStrings[item.id]);
        }
    });

    it("should create object with chinese object name", async () => {
        const { db } = this;
        const collection = await db.createCollection("create_object_with_chinese_object_name");
        const object = { 客家话: "Hello" };
        await collection.insert(object, { w: 1 });
        const doc = await collection.findOne();
        expect(doc.客家话).to.be.equal("Hello");
        const docs = await collection.find().toArray();
        expect(docs).to.have.lengthOf(1);
        expect(docs[0]).to.have.property("客家话", "Hello");
    });

    it("should correctly handle UTF8 key names", async () => {
        const { db } = this;
        const collection = await db.createCollection("test_utf8_key_name");
        await collection.insert({ šđžčćŠĐŽČĆ: 1 }, { w: 1 });
        const docs = await collection.find({}, { fields: ["šđžčćŠĐŽČĆ"] }).toArray();
        expect(docs).to.have.lengthOf(1);
        expect(docs[0]).to.have.property("šđžčćŠĐŽČĆ", 1);
    });
});
