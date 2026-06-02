const VoteStore = require("./VoteStore");

/**
 * InMemoryVoteStore — concrete VoteStore backed by an in-process Map.
 *
 * OOP concepts demonstrated:
 *  - INHERITANCE: extends the abstract VoteStore.
 *  - POLYMORPHISM: satisfies the VoteStore contract so the rest of the app
 *    talks to it through the parent type.
 *  - ENCAPSULATION: the Map is private; callers cannot mutate it directly.
 */
class InMemoryVoteStore extends VoteStore {
  #votesByVoter = new Map();

  hasVoted(voterCnic) {
    return this.#votesByVoter.has(voterCnic);
  }

  save(vote) {
    const cnic = vote.getVoterCnic();
    if (this.#votesByVoter.has(cnic)) {
      throw new Error(`Voter ${cnic} has already voted.`);
    }
    this.#votesByVoter.set(cnic, vote);
    return vote;
  }

  all() {
    return Array.from(this.#votesByVoter.values());
  }
}

module.exports = InMemoryVoteStore;
