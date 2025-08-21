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

**Tip:** This template applies to any branch and any conflicted file.
