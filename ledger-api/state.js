/*
SPDX-License-Identifier: Apache-2.0
*/

'use strict';

/**
 * State class. States have a class, unique key, and a lifecycle current state
 * the current state is determined by the specific subclass
 */
class State {

    /**
     * @param {Array<string>} keyParts to pull together to make a key for the objects
     */
    constructor(keyParts) {
        this.key = State.makeKey(keyParts);
    }

    getKey() {
        return this.key;
    }

    getSplitKey(){
        return State.splitKey(this.key);
    }

    serialize() {
        return State.serialize(this);
    }

    /**
     * Convert object to buffer containing JSON data serialization
     * Typically used before putState()ledger API
     * @param {State} JSON object to serialize
     * @return {Buffer} buffer with the data to store
     */
    static serialize(object) {
        return Buffer.from(JSON.stringify(object));
    }

    /**
     * Covert serialized data to JSON object
     * Typically used after getState() ledger API
     * @param {Buffer} buffer to deserialize into JSON object
     * @return {json} json with the data to store
     */
    static fromBuffer(buffer) {
        let json = JSON.parse(buffer.toString('utf8'));

        return json;
    }


    /**
     * Join the keyParts to make a unififed string
     * @param {Array<string>} keyParts
     */
    static makeKey(keyParts) {
        return keyParts.join(':');
    }

    static splitKey(key){
        return key.split(':');
    }

}

module.exports = State;