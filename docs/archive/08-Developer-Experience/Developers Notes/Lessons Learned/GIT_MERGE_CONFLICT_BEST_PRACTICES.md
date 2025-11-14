# Git Merge Conflict Resolution: Best Practices Template

When resolving a merge conflict between your current branch and another branch (e.g., `main`), follow these steps for a clean and explicit merge:

---

## 1. Pull and Merge
Run the following command to pull changes from the target branch and merge them into your current branch:

```bash
git pull --no-rebase origin main
```

This tells Git: “Pull from `main`, merge the changes into my current branch, and show me any conflicts.”

---

## 2. Resolve Conflicts
Git will flag files with conflict markers like:

```js
<<<<<<< HEAD
// Code from your branch
=======
// Code from the other branch
>>>>>>> other-branch
```

- Open the conflicted file(s) in your editor (e.g., VS Code)
- Manually merge the logic as needed
- Save the file(s)

---

## 3. Stage and Commit
After resolving conflicts, run:

```bash
git add <conflicted-file>
git commit -m "Resolve merge conflict with main"
git push origin <your-branch>
```

---

## 4. Update Pull Request
GitHub will update your pull request and remove the conflict warning once you push the resolved changes.

---

## 5. Get Help
If you’re unsure how to merge the code, paste the conflicted snippet here for assistance.

---

# GitHub Merge Propagation Failure: Manual Overwrite Best Practice

Sometimes, after resolving a merge conflict and merging a PR, the correct file logic does not appear in `main`. This is a **merge propagation failure**—not a logic error, but a breakdown in how the merge was applied or pushed. Common causes:

- The merge was squashed but not pushed correctly
- The merge commit was overwritten or lost in a rebase
- The PR was merged into a different branch by mistake

## 🛠️ Fastest Fix: Manual Overwrite

If the final, verified file exists (e.g., Jules has it), do this:

1. **Overwrite `main` directly** with the correct file
2. Commit with a clear message:
   ```bash
   git commit -m "Restore correct astrology-mathbrain.js with composite_transits, scoring, and overlays"
   git push origin main
   ```

This bypasses the broken merge and guarantees the file is correct.

## 🧾 Suggested Message to Collaborator

> Hi Jules,  
> Let’s bypass the broken merge. Please overwrite `netlify/functions/astrology-mathbrain.js` in `main` with the final, verified version from your session.  
> Use a commit message like:  
> "Restore correct astrology-mathbrain.js with composite_transits, scoring, and overlays"  
> Once pushed, I’ll confirm the file and we can proceed with full verification.  
> Thanks again for catching this.

## 🧾 Message to Jules: Sync Confirmation

> Hi Jules,  
> I’ve manually restored the correct version of `astrology-mathbrain.js` to `main`. The file now includes the full composite_transits logic, symbolic scoring, and diagnostic overlays.  
>  
> You can safely proceed with final integration testing and verification.  
>  
> If your local environment is still showing the old version, feel free to overwrite it with the current file from `main`. Let me know if you need the raw content again or want me to confirm the hash.  
>  
> Thanks again for your precision and patience—this triadic merge is finally sealed.

---

**Tip:** This template applies to any branch and any conflicted file.
