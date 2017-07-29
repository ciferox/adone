import PouchDB from "./setup";
import pouchDebug from "./../debug";
import pouchChangesFilter from "./../changes-filter";

// TODO: remove from pouchdb-core (breaking)
PouchDB.plugin(pouchDebug);

// TODO: remove from pouchdb-core (breaking)
PouchDB.plugin(pouchChangesFilter);

export default PouchDB;
