/**
 * Barrel for the OOP layer.
 *
 * The voting prototype's domain model lives here as plain JavaScript
 * classes, deliberately decoupled from React. Each class demonstrates
 * one or more of the four pillars of OOP:
 *
 *   - Person                  abstraction, encapsulation
 *   - User extends Person     inheritance, polymorphism (getRole)
 *   - Admin extends Person    inheritance, polymorphism (getRole, getDisplayName)
 *   - Candidate               encapsulation (read-only fields)
 *   - OTPManager              encapsulation (private code/expiry/attempts)
 *   - AuthenticationManager   abstraction over the multi-step voter auth flow
 *   - VoteManager             encapsulation of the tally + log + duplicate guard
 *   - AdminAuthManager        abstraction over the admin sign-in session
 *   - DashboardManager        façade that hides which manager owns which data
 */
export { Person } from "./Person.js";
export { User } from "./User.js";
export { Admin } from "./Admin.js";
export { Candidate } from "./Candidate.js";
export { OTPManager, otpManager } from "./OTPManager.js";
export {
  AuthenticationManager,
  getAuthManager,
} from "./AuthenticationManager.js";
export { VoteManager, getVoteManager } from "./VoteManager.js";
export { AdminAuthManager, getAdminAuthManager } from "./AdminAuthManager.js";
export { DashboardManager, getDashboardManager } from "./DashboardManager.js";
