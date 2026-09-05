# Build plan

Ordered by the priority given in the spec (`AI_Teacher_Technical_Flow.pdf`,
"Where to cut scope"): highest-weight and cheapest-to-build-well first,
avatar/video polish last.

- [x] **Part 1 — Scaffold.** Next.js App Router project, shared types,
      intake UI (topic or file + learner profile), stub `/api/lessons` route.
- [x] **Part 2 — LLM lesson planner.** Real call to Claude (structured
      outputs / JSON schema mode) that takes a topic + learner profile and
      returns a structured `LessonPlan` (sections, depth, checkpoint
      questions, misconception hooks). File-based requests still stub out —
      that's Part 4's job (RAG). Provider: Claude (`claude-sonnet-5`,
      overridable via `ANTHROPIC_MODEL`).
- [ ] **Part 3 — Adaptive Q&A loop.** Explain → ask → evaluate → adapt,
      text-first: serve one lesson section at a time, take an answer, have
      the LLM diagnose *why* it's wrong (not just right/wrong), branch to
      re-explanation or the next section.
- [ ] **Part 4 — RAG grounding.** File parsing (PDF first), chunking,
      embeddings, vector storage, retrieval feeding the Part 2 planner.
- [ ] **Part 5 — TTS + avatar.** One working narrated, avatar-presented
      segment end-to-end.
- [ ] **Part 6 — Video assembly.** Remotion compositing of avatar + captions
      + diagrams into a segment-based lesson video (not one giant render).
- [ ] **Part 7 — Multilingual.** Confirm the planner/TTS/avatar path works
      for a second language (Hindi), not just English.
- [ ] **Part 8 — Learning report.** End-of-lesson score, weak areas,
      next-topic recommendation, persisted to a student profile.

## Notes for future parts

- `src/lib/types.ts` is the contract between stages — extend it rather than
  duplicating shapes elsewhere.
- `POST /api/lessons` is the seam Part 2 replaces: same request/response
  shape, real LLM call instead of an echo.
- DB/persistence (student profiles, lesson plans, quiz results) is deferred
  until it's actually needed — Part 3 or 4, whichever needs it first.
