# CMS — instructions for AI agents

1. **Cursor rules** enforce mandatory behavior:
   - [`.cursor/rules/cms-mandatory.mdc`](../.cursor/rules/cms-mandatory.mdc) (`globs: CMS/**/*`).

2. **Human-readable source of truth:** **`AGENT_CODING_GUIDE.md`**.

3. **Registries you must keep updated** when you change code:
   - **`lib/services/SERVICES.md`** — every service function: inputs, outputs, notes.
   - **`lib/utils/UTILS.md`** — every util module worth reusing.

4. **Supabase project:** `nawznuthyvhmcheevkbf` only. Do not point CMS at any other database.

Do not complete a change that alters services or utils without updating the matching `.md` registry in the same change.
