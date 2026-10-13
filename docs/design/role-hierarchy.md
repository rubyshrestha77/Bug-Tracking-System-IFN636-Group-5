# Role hierarchy design note (BTSG-1 epic)

## Problem (before)

Roles were plain strings compared inside route middleware, for example
`requireRole('reporter')`. Every new role, or any change to what a role may do,
meant finding and editing each guard.

## Solution (after)

```
Role (abstract)
 |-- can(user, permission)      <- TEMPLATE METHOD (shared steps)
 |-- hasPermission(permission)  <- HOOK, overridden below
 |
 |-- AdminRole       users:view, users:manage, bug:view
 |-- ReporterRole    bug:view, bug:report, bug:verify, bug:reopen, bug:delete
 |-- DeveloperRole   bug:view, bug:assign, bug:start, bug:resolve

RoleFactory.create(name)  ->  Role object (or null for an unknown role)
requirePermission(perm)   ->  Express middleware using RoleFactory + role.can()
```

## Patterns

- **Factory Method:** `RoleFactory.create(name)` returns the right `Role` subclass.
  Callers never compare role strings or instantiate concrete roles directly.
- **Template Method:** `Role.can()` fixes the algorithm: (1) the account must exist
  and be active, (2) the user must hold this role, (3) ask the role-specific
  `hasPermission()` hook. Subclasses only override step 3.

## OOP principle

Inheritance: the concrete roles extend `Role`. Polymorphism: the same
`role.can(user, permission)` call gives a different answer depending on the
concrete class, because each overrides `hasPermission()`.

## Extensibility evidence

`backend/roles/examples/AuditorRole.js` is a read-only role added as one new
class. `backend/tests/extensibility.test.mjs` registers it with a single
`RoleFactory.register('auditor', AuditorRole)` call and shows that
`requirePermission` allows `users:view` and denies everything else, with no
change to any middleware, route or controller.

To reproduce the evidence for the report, run `git diff --stat` on the commit
that adds the Auditor role: it should list new files only, and no files under
`backend/middleware/`, `backend/routes/` or `backend/controllers/`.

## Related design decisions

- Self-registration is derived from the roles themselves
  (`Role.selfRegistrable`, `RoleFactory.selfRegistrableNames()`), so Admin can
  never be chosen at registration and new roles opt in explicitly.
- Deactivation takes effect immediately: login rejects inactive accounts, and
  `requireAuth` rejects tokens belonging to them.
- The last-admin rule lives in `services/lastAdminGuard.js` as a pure function,
  enforced server-side in `PATCH /api/users/:id/status`.
