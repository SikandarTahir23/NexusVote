const { generateReferenceNumber } = require("../utils/referenceNumber");

/**
 * Vote — immutable record of a single ballot.
 *
 * OOP concepts demonstrated:
 *  - ENCAPSULATION: all fields are private and only readable via getters,
 *    so a Vote cannot be mutated after construction.
 *
 * The reference number (VOTE-YYYYMMDD-XXXX) is minted at construction from
 * the shared generateReferenceNumber() utility and stamped onto the row the
 * store persists, so the ref we email the voter is the ref we store.
 */
class Vote {
  #voterCnic;
  #candidateId;
  #timestamp;
  #reference;
  constructor(voterCnic, candidateId) {
    this.#voterCnic = voterCnic;
    this.#candidateId = candidateId;
    this.#timestamp = new Date();
    this.#reference = generateReferenceNumber({ date: this.#timestamp });
    Object.freeze(this);
  }
  getVoterCnic() {
    return this.#voterCnic;
  }
  getCandidateId() {
    return this.#candidateId;
  }
  getTimestamp() {
    return this.#timestamp;
  }
  getReference() {
    return this.#reference;
  }

  
  toJSON() {
    return {
      voterCnic: this.#voterCnic,
      candidateId: this.#candidateId,
      timestamp: this.#timestamp.toISOString(),
      reference: this.#reference,
    };
  }
}
module.exports = Vote;
