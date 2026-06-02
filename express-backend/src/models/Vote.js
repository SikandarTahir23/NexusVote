/**
 * Vote — immutable record of a single ballot.
 *
 * OOP concepts demonstrated:
 *  - ENCAPSULATION: all fields are private and only readable via getters,
 *    so a Vote cannot be mutated after construction.
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
    this.#reference = `VR-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
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
