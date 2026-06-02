const Vote = require("../models/Vote");

/**
 * VoteManager — orchestrates the act of casting a vote.
 *
 * OOP concepts demonstrated:
 *  - ABSTRACTION: exposes a small surface (cast, hasVoted) hiding the
 *    duplicate-prevention and persistence details.
 *  - POLYMORPHISM (via dependency injection): accepts ANY VoteStore subclass
 *    AND any candidate provider that implements findById. Swap MysqlVoteStore
 *    for InMemoryVoteStore (or vice-versa) without touching this class or
 *    its callers. server.js wires concrete instances at startup.
 *  - ENCAPSULATION: the underlying stores are private.
 */
class VoteManager {
  #store;
  #candidates;

  constructor(store, candidates) {
    this.#store = store;
    this.#candidates = candidates;
  }

  async hasVoted(voterCnic) {
    return this.#store.hasVoted(voterCnic);
  }

  async cast({ voterCnic, candidateId }) {
    if (!voterCnic || !candidateId) {
      throw new Error("Voter CNIC and candidate are required.");
    }
    const candidate = await this.#candidates.findById(candidateId);
    if (!candidate) {
      throw new Error("Unknown candidate.");
    }
    if (await this.#store.hasVoted(voterCnic)) {
      throw new Error("You have already cast your vote.");
    }
    const vote = new Vote(voterCnic, candidateId);
    return this.#store.save(vote);
  }

  async allVotes() {
    return this.#store.all();
  }

  /**
   * Aggregate tallies for the admin dashboard.
   *
   * Returns:
   *  {
   *    totalVotes: number,
   *    byCandidate: [{ id, name, party, partyColor, symbol, votes, percentage }]
   *  }
   *
   * Calculated in JS rather than SQL so the same code works against the
   * in-memory store (used by tests) and the MySQL store.
   */
  async getStatistics() {
    const [candidates, votes] = await Promise.all([
      this.#candidates.findAll(),
      this.#store.all(),
    ]);

    const totalVotes = votes.length;
    const counts = new Map();
    for (const v of votes) {
      // votes from MysqlVoteStore are plain objects; in-memory votes are
      // Vote instances — handle both.
      const cid = typeof v.getCandidateId === "function" ? v.getCandidateId() : v.candidateId;
      counts.set(cid, (counts.get(cid) || 0) + 1);
    }

    const byCandidate = candidates.map((c) => {
      const count = counts.get(c.getId()) || 0;
      const pct = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 1000) / 10;
      return {
        ...c.toJSON(),
        votes: count,
        percentage: pct,
      };
    });

    return { totalVotes, byCandidate };
  }
}

module.exports = VoteManager;
