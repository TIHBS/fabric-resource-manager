const State = require("./../ledger-api/state.js");
const TxState = require('./tx-state.js');

class TxDetails extends State {

    constructor(obj) {
        super([obj.id]);
        Object.assign(this, obj);
    }

    setId(newId) {
        this.id = newId;
    }

    getId() {
        return this.id;
    }

    setOwner(newOwner) {
        this.owner = newOwner;
    }

    getOwner() {
        return this.owner;
    }

    setState(newState) {
        this.state = newState;
    }

    getState() {
        return this.state;
    }

    getLockedVariables() {
        return this.lockedVariables;
    }

    static fromBuffer(buffer) {
        return new TxDetails(State.deserialize(buffer));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Deserialize a state data to txdetails
     * @param {Buffer} data to form back into the object
     */
    static deserialize(data) {
        return new TxDetails(State.deserializeClass(data));
    }

    /**
     * Factory method to create a txdetails object
     */
    static createInstance(id, owner) {
        return new TxDetails({ id: id, owner: owner, state: TxState.STARTED, lockedVariables: [] });
    }
}

module.exports = TxDetails;