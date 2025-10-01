# Main Branch Lockup Guide

This guide covers how to diagnose and resolve issues when your main branch on GitHub becomes "locked up"—whether due to unresponsive Git commands, authentication problems, repository archiving, or deployment failures.

---

## 1. Resolving Unresponsive Git Commands (Hanging `git status`, `add`, `push`, `pull`)

- **Check for Stuck Processes or File Locks**:
  - On Windows, IDEs or sync services may lock files. Reboot or kill processes (`Task Manager`, `ps -ef | grep git`).
  - On macOS/Linux, use `ps -ef | grep git` and `kill`.
- **Repository Integrity and Size**:
  - Run `git fsck` and `git gc` to check and clean up the repo.
  - Large, untracked files or a bad `.gitignore` can cause hangs. Move files or fix `.gitignore`.
- **Network/SSH Connection Issues**:
  - Try a different network. If SSH is blocked, edit `~/.ssh/config`:
    ```
    Host github.com
      Hostname ssh.github.com
      Port 443
    ```
  - Test with `ssh -T git@github.com`.

## 2. Resolving `.git/index.lock` File Errors

- **Delete the lock file**:
  - macOS/Linux: `rm -f .git/index.lock`
  - Windows: `del .git\index.lock` or `rm -Force ./.git/index.lock`
  - Use `sudo` or `chown` if needed.

## 3. Fixing Constant Password Prompts / Authentication Issues

- **Switch to SSH**: Change remote URL to SSH format.
- **Credential Helpers**: Use `git config --global credential.helper store|osxkeychain|wincred`.
- **Personal Access Tokens (PATs)**: Use PATs for HTTPS operations.
- **SSH Key Management**: Ensure keys are added to your agent.
- **GitHub CLI**: Use `gh auth login` for easy setup.

## 4. Avoiding Workflow Lock-ups from Rewriting `main` Branch History

- **Use Feature Branches**: Never commit directly to `main`.
- **Never Rebase Shared Branches**: Only rebase local, unpushed commits.
- **Use `git revert` for Pushed Changes**: Safely undo commits.
- **Use `git push --force-with-lease` for Amends**: Safer than `--force`.

## 5. Managing Archived Repositories

- **Unarchive to make changes**:
  1. Go to repo Settings > Danger Zone > Unarchive.
  2. Confirm and unarchive.

## 6. Addressing Netlify Deployment Issues for the Main Branch

- **Diagnose Deploy Failures**: Use Netlify's "Why did it fail?" AI.
- **Common Causes**:
  - Permissions, build command errors, case sensitivity, Next.js plugin conflicts.
- **Environment Variables**: Ensure `.env` is set for local dev and restart Netlify after changes.

---

To summarize, fixing a "locked up" main branch requires systematically checking for underlying issues, from local Git problems and authentication to repository configuration and deployment pipeline health.

---

**Next Step**: Start by checking for hanging Git commands locally. Apply `git fsck` and `git gc`, and investigate any `index.lock` files. For push/pull issues, verify your remote URL and authentication method.
