import adone from "adone";
import Redis from "./redis";

adone.lazify({
    ReplyError: "./reply_error",
    Cluster: "./cluster",
    Command: "./command"
}, Redis, require);

export default Redis;
