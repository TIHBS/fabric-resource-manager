const State = require("../../ledger-api/state.js");
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
     * @param {string} newOwner 
     */
    setOwner(newOwner) {
        this.owner = newOwner;
    }

    /**
     * 
     * @returns {string}
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
     * @param {Buffer} buffer 
     * @returns {TxDetails}
     */
    static fromBuffer(buffer) {
        let tx = this.deserialize(State.fromBuffer(buffer));

        return tx;
    }


    /**
     * Deserialize a state data to txdetails
     * @param {Object} data to form back into the object
     */
    static deserialize(data) {
        let tx = new TxDetails(data);

        return tx;
    }

    /**
     * Factory method to create a txdetails object
     * @param {string} id
     * @param {string} owner
     */
    static createInstance(id, owner) {
        return new TxDetails({ id: id, owner: owner, state: TxState.STARTED });
    }
}

module.exports = TxDetails;