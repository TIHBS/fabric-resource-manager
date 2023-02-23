const { ClientIdentity } = require("fabric-shim");
const State = require("./../ledger-api/state.js");
const TxState = require('./tx-state.js');

class TxDetails extends State {

    constructor(obj) {
        super([obj.id]);
        Object.assign(this, obj);
    }

    /**
     * 
     * @param {string} newId 
     */
    setId(newId) {
        this.id = newId;
    }

    /**
     * 
     * @returns {string}
     */
    getId() {
        return this.id;
    }


    /**
     * 
     * @param {ClientIdentity} newOwner 
     */
    setOwner(newOwner) {
        this.owner = newOwner;
    }

    /**
     * 
     * @returns {ClientIdentity}
     */
    getOwner() {
        return this.owner;
    }

    /**
     * 
     * @param {TxState} newState 
     */
    setState(newState) {
        this.state = newState;
    }

    /**
     * 
     * @returns {TxState}
     */
    getState() {
        return this.state;
    }

    /**
     * 
     * @returns {Array<string>}
     */
    getLockedVariables() {
        return this.lockedVariables;
    }

    /**
     * 
     * @param {Array<string>} newLockedVariables 
     */
    setLockedVariables(newLockedVariables) {
        this.lockedVariables = newLockedVariables;
    }

    /**
     * 
     * @param {Buffer} buffer 
     * @returns {TxDetails}
     */
    static fromBuffer(buffer) {
        return new TxDetails(State.deserialize(buffer));
    }

    /**
     * 
     * @returns {Buffer}
     */
    toBuffer() {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Deserialize a state data to txdetails
     * @param {Buffer} data to form back into the object
     */
    static deserialize(data) {
        return this.fromBuffer(data);
    }

    /**
     * Factory method to create a txdetails object
     * @param {string} id
     * @param {ClientIdentity} owner
     */
    static createInstance(id, owner) {
        return new TxDetails({ id: id, owner: owner, state: TxState.STARTED, lockedVariables: [] });
    }
}

module.exports = TxDetails;