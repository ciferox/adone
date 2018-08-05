const { json, bson, mpak, json5 } = adone.data;

const object = {
    _id: "58aa0cf1bf5d37c3ad8bfb6e",
    index: 0,
    guid: "9f4cb8e7-e086-4f70-86ad-f93ed969b2dd",
    isActive: false,
    balance: "$3,704.42",
    picture: "http://placehold.it/32x32",
    age: 29,
    eyeColor: "brown",
    isInctive: true,
    name: "Alyce Alston",
    gender: "female",
    company: "GONKLE",
    email: "alycealston@gonkle.com",
    phone: "+1 (968) 525-3539",
    address: "317 Manhattan Court, Idledale, Idaho, 2922",
    about: "Ut aliquip anim voluptate et minim cupidatat veniam qui minim anim officia officia. Sunt ad veniam Lorem magna eu. Magna cupidatat tempor Lorem quis magna ipsum nisi incididunt cupidatat sint elit exercitation cillum excepteur. Tempor ex exercitation aute et dolor consequat duis aliquip do in culpa qui sunt commodo. Mollit id ad est ea eiusmod duis. Quis nostrud tempor do ex laborum enim magna proident sint nulla et magna quis. Pariatur occaecat velit laborum proident officia laboris officia minim.\r\n",
    registered: "2015-07-02T12:38:39 -02:00",
    latitude: -3.824567,
    longitude: -50.498374,
    tags: [
        "ullamco",
        "do",
        "Lorem",
        "commodo",
        "Lorem",
        "laboris",
        "commodo"
    ],
    friends: [
        {
            id: 0,
            name: "Florence Drake"
        },
        {
            id: 1,
            name: "Alberta Park"
        },
        {
            id: 2,
            name: "Maynard Mann"
        }
    ],
    greeting: "Hello, Alyce Alston! You have 7 unread messages.",
    favoriteFruit: "banana",
    undef: undefined,
    nullable: null
};

let jsonData = null;
let bsonData = null;
let mpakData = null;
let json5Data = null;

export const init = async () => {
    jsonData = json.encode(object);
    bsonData = bson.encode(object);
    mpakData = mpak.encode(object);
    json5Data = json5.encode(object);

    let initor;
    initor = bson.serializer;
    initor = mpak.serializer;
    return initor;
};

export default {
    Encode: {
        "json"() {
            return json.encode(object);
        },
        "bson"() {
            return bson.encode(object);
        },
        "mpak"() {
            return mpak.encode(object);
        },
        "json5"() {
            return json5.encode(object);
        }
    },
    Decode: {
        "json"() {
            return json.decode(jsonData);
        },
        "bson"() {
            return bson.decode(bsonData);
        },
        "mpak"() {
            return mpak.decode(mpakData);
        },
        "json5"() {
            return json5.decode(json5Data);
        }
    }
};
