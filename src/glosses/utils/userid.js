import adone from "adone";

const b = adone.bind("userid.node");

export default {
    uid: b.uid,
    gid: b.gid,
    username: b.username,
    groupname: b.groupname,
    gids: b.gids
};
