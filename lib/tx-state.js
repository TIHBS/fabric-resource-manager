// class TxState {
//     static UNDEFINED;
//     static STARTED;
//     static COMMITTED;
//     static ABORTED;


//     constructor(name) {
//         this.name = name;
//     }

//     static {
//         UNDEFINED = new TxState("UNDEFINED");
//         STARTED = new TxState("STARTED");
//         COMMITTED = new TxState("COMMITTED");
//         ABORTED = new TxState("ABORTED");
//     }
// }

const TxState = {
    UNDEFINED: "UNDEFINED",
    STARTED: "STARTED",
    COMMITTED: "COMMITTED",
    ABORTED: "ABORTED"
};


module.exports = TxState;