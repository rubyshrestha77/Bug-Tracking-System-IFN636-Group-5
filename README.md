# Bug Tracking System

IFN636 Software Life Cycle Management — Assessment 1
Ruby Shrestha — n12643572

A web-based bug tracking system with three user roles. Reporters submit defects
and verify fixes; Developers review, assign and resolve them; Admins manage user
accounts.

## Tech Stack

- **Frontend:** React, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas (Mongoose)
- **Auth:** JSON Web Tokens

## Setup

Prerequisites: Node.js 18+, npm, and a MongoDB connection string.

All commands run from the repository root.

1. Clone the repository
2. Install dependencies for root, backend and frontend: `npm run install-all`
3. Create `backend/.env` with the following variables:
   - `MONGO_URI` — your MongoDB connection string
   - `JWT_SECRET` — any long random string
   - `PORT` — 5000
4. Create the first admin (admins cannot self-register). With `ADMIN_EMAIL` and
   `ADMIN_PASSWORD` set in your shell or in `backend/.env`, run
   `node backend/scripts/seedAdmin.js`. The script also backfills `isActive` on
   any existing users.
5. Start both servers: `npm run start`

Frontend runs on `localhost:3000`, backend on `localhost:5000`.

For development with auto-restart on file changes, use `npm run dev` instead.

Run the automated tests from the repository root with `npm test`.

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Reporter | reporter@demo.com | password123 |
| Developer | developer@demo.com | password123 |

These accounts are not seeded automatically. Register them through the
application, or use any accounts you create — the role is selected at
registration.

## Design Prototype

Figma file (view-only):https://www.figma.com/design/s5tfMt6eLPiSmSs4lowXjQ/BugTrackingSystem?node-id=18-925&t=WyqjRDeIbIpD6Hei-1
Clickable prototype: https://www.figma.com/proto/s5tfMt6eLPiSmSs4lowXjQ/BugTrackingSystem?node-id=23-1122&t=BMhuIwD8ZAO8Ezyc-1

Low-fidelity wireframes are in `docs/wireframes/low-fidelity/`;
high-fidelity screens in `docs/wireframes/high-fidelity/`.

## Architecture

A React single-page application communicates with an Express REST API over JSON.

Authentication uses JSON Web Tokens issued at login and verified by `requireAuth`
middleware on every protected route; deactivated accounts are rejected at login
and at `requireAuth`. Authorisation is layered: a role class hierarchy decides
which permissions each role holds, and per-resource ownership checks ensure that
only a bug's assignee can resolve it, and only its original reporter can verify,
reopen or delete it.

### Role hierarchy

`Role` is an abstract base class whose template method `can(user, permission)`
runs the shared steps (account is active, user holds this role) and then calls
the `hasPermission()` hook, which `AdminRole`, `ReporterRole` and `DeveloperRole`
each override. `RoleFactory.create(name)` returns the matching role object, and
`requirePermission(permission)` guards each route, so no middleware compares role
strings. Adding a role means adding one class and one `RoleFactory.register` call.
See `docs/design/role-hierarchy.md`.

Bug state transitions are validated server-side before persisting, so the
workflow cannot be bypassed by direct API calls. Data is persisted in MongoDB
Atlas via Mongoose, across two collections: `users` and `bugs`.

## Bug Lifecycle

| Status | Set by | Transitions to |
|--------|--------|----------------|
| New | Reporter submits a bug | Assigned, or deleted by the reporter |
| Assigned | Developer sets priority and assigns to self | In Progress |
| In Progress | Assignee starts work | Resolved |
| Resolved | Assignee adds a resolution note | Closed or Reopened |
| Reopened | Reporter reopens with a reason | In Progress |
| Closed | Reporter verifies the fix | terminal |

## Branch and Commit Conventions

Work is tracked in Jira (project key `BTSG`). Every branch and commit references
its Jira issue so history maps directly to the backlog.

**Branches:** `feature/BTSG-<id>-<short-description>`
Example: `feature/BTSG-6-admin-views-users`

**Commits:** `BTSG-<id>: <imperative summary>`
Example: `BTSG-6: extend User schema with isActive`

**Workflow:** feature branch → incremental commits → pull request → self-review
→ merge to `main`. History is never rewritten.

## Deployment

Not deployed. Deployment was confirmed out of scope for this assessment
following tutor consultation on 26 August 2026. An AWS EC2 instance was
provisioned, configured with a security group restricted to the developer's IP
address, and the repository cloned to it as a development environment.

## Known Limitations

- Session state is held in `localStorage`; there is no token refresh or expiry handling
- Reporters and Developers self-register and select their own role; a production system would require administrator approval (Admins are created only with the seed script)
- MongoDB Atlas network access is open to all IP addresses
- Form validation messages appear below submit buttons rather than above
- Bugs cannot be reassigned between developers once claimed
- Closed bugs cannot be reopened; a recurring defect is raised as a new bug
- Two admins deactivating each other at the same instant could bypass the last-admin guard
- `updateUserProfile` does not check for duplicate emails, so a clash returns a generic server error