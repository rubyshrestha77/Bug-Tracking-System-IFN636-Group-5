# Bug Tracking System

IFN636 Software Life Cycle Management — Assessment 1
Ruby Shrestha — n12643572

A web-based bug tracking system with two user roles. Reporters submit defects
and verify fixes; Developers review, assign and resolve them.

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
4. Start both servers: `npm run start`

Frontend runs on `localhost:3000`, backend on `localhost:5000`.

For development with auto-restart on file changes, use `npm run dev` instead.

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
middleware on every protected route. Authorisation is layered: `requireRole`
restricts endpoints to Reporters or Developers, and per-resource ownership checks
ensure that only a bug's assignee can resolve it, and only its original reporter
can verify, reopen or delete it.

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

Work is tracked in Jira (project key `BTS`). Every branch and commit references
its Jira issue so history maps directly to the backlog.

**Branches:** `feature/BTS-<id>-<short-description>`
Example: `feature/BTS-10-register-with-role-selection`

**Commits:** `BTS-<id>: <imperative summary>`
Example: `BTS-10: add User schema with role enum`

**Workflow:** feature branch → incremental commits → pull request → self-review
→ merge to `main`. History is never rewritten.

## Deployment

Not deployed. Deployment was confirmed out of scope for this assessment
following tutor consultation on 26 August 2026. An AWS EC2 instance was
provisioned, configured with a security group restricted to the developer's IP
address, and the repository cloned to it as a development environment.

## Known Limitations

- Session state is held in `localStorage`; there is no token refresh or expiry handling
- Users self-register and select their own role; a production system would require administrator approval
- MongoDB Atlas network access is open to all IP addresses
- Form validation messages appear below submit buttons rather than above
- Bugs cannot be reassigned between developers once claimed
- Closed bugs cannot be reopened; a recurring defect is raised as a new bug
- No automated test suite