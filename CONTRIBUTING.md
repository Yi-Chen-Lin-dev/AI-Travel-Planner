# Team collaboration guide

## First-time setup
1. Accept the repository invitation using your own GitHub account.
2. Install Git and your editor. Configure your own Git author name and email.
3. Clone the repository using the command in README.md.
4. Practice with a small documentation change and a pull request.

## Start a new task
Create an Issue with its purpose and acceptance criteria. Agree on an owner.
With your current work committed or safely stashed:
```sh
git switch main
git pull --ff-only
git switch -c feature/short-task-name
```
Use `feature/`, `fix/`, `docs/`, or `refactor/` prefixes. Create branches per task, not permanent branches per person.

## Save and share changes
```sh
git status
git diff
git add path/to/changed-file
git diff --cached
git commit -m "feat: describe the change"
git push -u origin feature/short-task-name
```
Replace the example path and branch name with yours. Check staged changes before committing. Later pushes on the same branch can use `git push`.

A commit saves a local version; a push uploads commits to GitHub. The staging area is local and is not cloud backup. Incomplete work can be committed and pushed to a feature branch; use a draft PR until ready.

## Pull requests
Explain what changed, why, and how it was tested. Link the Issue with `Closes #NUMBER` when appropriate. Ask at least one teammate to review. Fix requested changes on the same branch, then merge after review and successful relevant checks.

## Definition of done
- Acceptance criteria are met.
- Relevant tests and manual checks pass; evidence is recorded in the PR.
- At least one teammate has reviewed the changes.
- Documentation and configuration examples are updated where needed.
- The PR is merged into `main` and the Issue is closed.

## Conflicts
Do not overwrite another person's changes or force-push `main`. Coordinate with the owner, resolve conflicting sections intentionally, then test the combined behavior before merging.

## Ownership
Members have primary areas (frontend, backend, AI), but should also understand integration boundaries. Assign actual owners together; repository setup does not assign people automatically.

## Commit conventions
Use `feat:`, `fix:`, `docs:`, `test:`, or `refactor:` followed by a specific description.
