# Finalize Feature

Finalize the feature **[FEATURE NAME]** we just built:

1. Run `pnpm lint` and `pnpm type-check` - fix any errors
2. Review all implementation work from the various tasks built for the feature, and update `docs/Features/[feature-name].md` with any relevant detail for documentation.
3. Update `docs/changelog.md` with what was added/changed
4. Update `docs/project_status.md` to mark feature complete (move the completed feature to the bottom of the document and remove any no-longer-needed detail about the specific sequencing of this feature build, to try and keep this project_status doc compact)
5. Add any architectural decisions to `docs/decision_log.md`
6. Prepare a conventional commit message and propose a version tag using the naming convention "vX.Y.Z" where X is the milestone number (starting at 0 for MVP), Y is the feature number from the milestone plan, and Z is used for iterations like major bug fixes or incremental unplanned features.

Start with step 1.
