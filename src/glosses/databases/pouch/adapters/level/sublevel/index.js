import nut from "./nut";
import shell from "./shell";
const Codec = adone.database.level.Codec;
import ReadStream from "./readStream";
import precodec from "./legacyCodec";

const codec = new Codec();

export default function sublevelPouch(db) {
    return shell(nut(db, precodec, codec), [], ReadStream, db.options);
}
