/*
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @enum
 */
const TxState = {
    UNDEFINED: "UNDEFINED",
    STARTED: "STARTED",
    PREPARED: "PREPARED",
    COMMITTED: "COMMITTED",
    ABORTED: "ABORTED"
};


module.exports = TxState;