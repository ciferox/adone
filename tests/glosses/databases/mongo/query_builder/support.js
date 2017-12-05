const host = process.env.DB_HOST || process.env.MONGODB_HOST || "localhost";
const port = process.env.MONGODB_PORT || 27017;
const dbToUse = process.env.MONGODB_DB || "query_builder";
let db;

export const getCollection = async () => {
    db = await adone.database.mongo.connect(`mongodb://${host}:${port}/${dbToUse}`);
    const collection = db.collection("stuff");
    await db.dropDatabase();
    return collection;
};

export const dropCollection = async () => {
    if (db) {
        await db.dropDatabase();
        await db.close();
    }
};
