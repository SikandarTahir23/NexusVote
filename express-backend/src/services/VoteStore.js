/**
 * VoteStore — abstract storage contract for cast votes.
 *
 * OOP concepts demonstrated:
 *  - ABSTRACTION: defines WHAT a vote store must do (hasVoted, save, all)
 *    without specifying HOW the votes are persisted.
 *  - POLYMORPHISM: VoteManager depends on this interface, so InMemoryVoteStore
 *    can be swapped for a MysqlVoteStore later without changing callers.
 */
class VoteStore {
  hasVoted(/* voterCnic */) {
    throw new Error("hasVoted() must be implemented by subclass.");
  }
  save(/* vote */) {
    throw new Error("save() must be implemented by subclass.");
  }
  all() {
    throw new Error("all() must be implemented by subclass.");
  }
}

module.exports = VoteStore;
