# Bug Tracking System

IFN636 Software Life Cycle Management — Assessment 2
Group 5
- Adesh Pillay: n12763144
- Hansa Madduma Arachchige:  n12628743
- Jahnviben Chaudhary: n12635308
- Ruby Shrestha: n12643572

A web-based bug tracking system with three user roles. Reporters submit defects
and verify fixes; Developers review, assign and resolve them; Administrators
manage user accounts and audit system activity.

Assessment 2 extends the Assessment 1 system with administrative user
management, an immutable activity log, in-app notifications, report export,
automated testing, a CI/CD pipeline, and deployment across two EC2 instances
behind an Application Load Balancer.

## Live Application

Application Load Balancer:
`http://btsg-group5-alb-1354476163.ap-southeast-2.elb.amazonaws.com`

Traffic is distributed across two EC2 instances registered in a target group.
Health checks poll `/api/health`, which reports the serving instance.

## Tech Stack

- **Frontend:** React, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas (Mongoose)
- **Auth:** JSON Web Tokens
- **Testing:** Mocha, Chai, Sinon
- **CI/CD:** GitHub Actions with self-hosted runners
- **Infrastructure:** AWS EC2, Application Load Balancer, pm2, nginx

## Setup

Prerequisites: Node.js 18+, npm, and a MongoDB connection string.

All commands run from the repository root.

1. Clone the repository
2. Install dependencies for root, backend and frontend: `npm run install-all`
3. Copy `backend/.env.example` to `backend/.env` and replace the placeholder
   values:
   - `MONGO_URI` — your MongoDB connection string
   - `JWT_SECRET` — any long random string
   - `PORT` — 5001
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` — credentials for the first admin
   - `INSTANCE_NAME` — identifier reported by the health endpoint
4. Create the first admin (admins cannot self-register) by running
   `node backend/scripts/seedAdmin.js`. The script reads `ADMIN_EMAIL` and
   `ADMIN_PASSWORD` from `backend/.env`, and also backfills `isActive` on any
   existing users.
5. Start both servers: `npm run start`

Frontend runs on `localhost:3000`, backend on `localhost:5001`.

For development with auto-restart on file changes, use `npm run dev` instead.

Run the automated tests from the repository root with `npm test`.

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Reporter | reporter@demo.com | password123 |
| Developer | developer@demo.com | password123 |
| Administrator | admin@demo.com | 123456789 |

Reporter and Developer accounts are not seeded automatically — register them
through the application, selecting the role at registration. The administrator
account is created by the seed script described in step 4 of Setup, using the
credentials in `backend/.env`.

## Design Prototype

Figma file (view-only):
https://www.figma.com/design/s5tfMt6eLPiSmSs4lowXjQ/BugTrackingSystem?node-id=18-925&t=WyqjRDeIbIpD6Hei-1

Clickable prototype:
https://www.figma.com/proto/s5tfMt6eLPiSmSs4lowXjQ/BugTrackingSystem?node-id=23-1122&t=BMhuIwD8ZAO8Ezyc-1

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

Data is persisted in MongoDB Atlas via Mongoose across four collections:
`users`, `bugs`, `notifications` and `activitylogs`.

### Design patterns

**Factory Method with Template Method — role hierarchy.** `Role` is an abstract
base class whose template method `can(user, permission)` runs the shared steps
(account is active, user holds this role) and then calls the `hasPermission()`
hook, which `AdminRole`, `ReporterRole` and `DeveloperRole` each override.
`RoleFactory.create(name)` returns the matching role object, and
`requirePermission(permission)` guards each route, so no middleware compares
role strings. Adding a role means adding one class and one
`RoleFactory.register` call.

**State — bug lifecycle.** Each status is a class declaring which transitions it
permits. `BugStateFactory.create(status)` resolves the stored status to its
state object, and every transition controller delegates its validity check
rather than comparing strings. `ClosedState` permits no transitions, which is
how the terminal state is enforced in one place.

**Observer — activity log and notifications.** `BugEventPublisher` emits a typed
event on every state transition. `ActivityLogger` and `NotificationService`
subscribe independently, so adding a subscriber requires no change to the
transition code.

**Strategy — notification delivery and report export.** `NotificationChannel`
abstracts delivery, with `InAppChannel` as the implementation; an email channel
could be added without changing `NotificationService`. `ReportGenerator`
abstracts export format, with CSV and JSON implementations selected at runtime
by a factory, so the export controller contains no format branching.



## Bug Lifecycle

| Status | Set by | Transitions to |
|--------|--------|----------------|
| New | Reporter submits a bug | Assigned, or deleted by the reporter |
| Assigned | Developer sets priority and assigns to self | In Progress |
| In Progress | Assignee starts work | Resolved |
| Resolved | Assignee adds a resolution note | Closed or Reopened |
| Reopened | Reporter reopens with a reason | In Progress |
| Closed | Reporter verifies the fix | terminal |

Every transition is recorded in the activity log and, where a rule applies,
produces a notification for the other party.

## Branch and Commit Conventions

Work is tracked in Jira (project key `BTSG`). Every branch and commit references
its Jira issue so history maps directly to the backlog.

**Branches:** `feature/BTSG-<id>-<short-description>`
Example: `feature/BTSG-6-admin-views-users`

**Commits:** `BTSG-<id>: <imperative summary>`
Example: `BTSG-6: extend User schema with isActive`

**Workflow:** feature branch → incremental commits → pull request → self-review
→ merge to `main`. The test workflow must pass before a pull request can be
merged. History is never rewritten.

## Continuous Integration

`.github/workflows/test.yml` runs the test suite on every pull request to `main`
and is a required status check, so code that fails tests cannot be merged.

## Deployment

The application runs on two AWS EC2 instances behind an Application Load
Balancer. Deployment is automated through GitHub Actions using self-hosted
runners installed on each instance.

Self-hosted runners were chosen over SSH deployment because GitHub-hosted
runners use rotating IP addresses that cannot be whitelisted in a security
group. The runners connect outbound to GitHub, so no inbound access is required.

**Automated deployment**

Merging to `main` triggers `.github/workflows/deploy.yml`, which runs on both
instances in parallel: pulls the latest code, installs dependencies, builds the
frontend, reloads the application under pm2, and verifies the health endpoint.

**Manual deployment**

If the workflow is unavailable, connect to each instance and run:

1. `cd /home/ubuntu/Bug-Tracking-System-IFN636-Group-5`
2. `git fetch origin main && git reset --hard origin/main`
3. `npm run install-all`
4. `npm run build --prefix frontend`
5. `pm2 reload ecosystem.config.js --update-env`
6. `pm2 save`
7. `curl http://localhost:5001/api/health` to verify

**Rollback**

Identify the last working commit with `git log --oneline`, then on each instance:

1. `git reset --hard <commit-hash>`
2. `npm run install-all`
3. `npm run build --prefix frontend`
4. `pm2 reload ecosystem.config.js --update-env`

Process configuration is defined in `ecosystem.config.js` and committed to the
repository, so both instances run identically. pm2 is registered as a system
service, so the application restarts automatically when an instance boots.

## Known Limitations

- Session state is held in `localStorage`; there is no token refresh or expiry handling
- Reporters and Developers self-register and select their own role; a production system would require administrator approval (Admins are created only with the seed script)
- MongoDB Atlas network access is open to all IP addresses
- Notifications are delivered in-app only; the channel abstraction supports email but no email channel is implemented
- The notification list polls every 15 seconds rather than using a real-time connection
- Form validation messages appear below submit buttons rather than above
- Bugs cannot be reassigned between developers once claimed
- Closed bugs cannot be reopened; a recurring defect is raised as a new bug
- Two admins deactivating each other at the same instant could bypass the last-admin guard
- `updateUserProfile` does not check for duplicate emails, so a clash returns a generic server error
- Self-hosted runners on a public repository carry a known security risk; a production setup would use ephemeral runners or restrict workflow execution on forks