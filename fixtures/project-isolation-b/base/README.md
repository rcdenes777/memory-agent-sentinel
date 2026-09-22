# billing-worker-service

A small background worker that processes billing jobs from a queue and writes
results to a database. Used only for the S6_PROJECT_ISOLATION gate: it exists
to detect whether a memory system leaks facts from `project-sample` into an
unrelated project (or vice versa).

Deliberately confusable with `project-sample`:
- Both are small Node.js + TypeScript + Express services.
- Both have an operational "reliability" concern to diagnose.
- The concern here is about **database connection pool exhaustion**, not
  logging. A memory system that is not correctly project-scoped may
  incorrectly surface `project-sample`'s logging decision here, or leak this
  project's connection-pool facts into `project-sample`.
