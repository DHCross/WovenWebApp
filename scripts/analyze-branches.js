#!/usr/bin/env node

/**
 * Branch Analysis Tool for WovenWebApp
 * 
 * This script analyzes all branches in the repository and identifies:
 * 1. Branches that have been merged into main
 * 2. Branches that are outdated (behind main by many commits)
 * 3. Branches with old last commit dates
 * 4. Branches that appear to be stale feature/fix branches
 */

const { execSync } = require('child_process');
const fs = require('fs');

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', cwd: process.cwd() }).trim();
  } catch (error) {
    return '';
  }
}

function getBranchInfo() {
  console.log('Fetching branch information from GitHub...\n');
  
  // Get all remote branches with details
  const branchesRaw = exec(
    'git for-each-ref --format="%(refname:short)|%(committerdate:iso8601)|%(authorname)|%(subject)" refs/remotes/origin/'
  );
  
  if (!branchesRaw) {
    console.error('Error: Could not fetch branch information');
    return [];
  }
  
  const branches = branchesRaw
    .split('\n')
    .filter(line => line && !line.includes('HEAD'))
    .map(line => {
      const [name, date, author, subject] = line.split('|');
      return {
        name: name.replace('origin/', ''),
        date: new Date(date),
        author,
        subject,
        fullName: name
      };
    });
  
  return branches;
}

function getMainCommitDate() {
  const dateStr = exec('git log main -1 --format="%ci"');
  return new Date(dateStr);
}

function isMergedIntoMain(branchName) {
  const result = exec(`git branch -r --merged main | grep "origin/${branchName}$"`);
  return result.length > 0;
}

function getCommitsBehindMain(branchName) {
  try {
    const result = exec(`git rev-list --count main..origin/${branchName}`);
    const ahead = parseInt(result) || 0;
    const behindResult = exec(`git rev-list --count origin/${branchName}..main`);
    const behind = parseInt(behindResult) || 0;
    return { ahead, behind };
  } catch (error) {
    return { ahead: 0, behind: 0 };
  }
}

function categorizeBranches(branches, mainDate) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
  
  const categories = {
    merged: [],
    stale: [],
    outdated: [],
    recent: [],
    workInProgress: []
  };
  
  branches.forEach(branch => {
    // Skip main branch
    if (branch.name === 'main') {
      return;
    }
    
    const merged = isMergedIntoMain(branch.name);
    const { ahead, behind } = getCommitsBehindMain(branch.name);
    const daysSinceCommit = Math.floor((now - branch.date) / (1000 * 60 * 60 * 24));
    
    const branchInfo = {
      ...branch,
      daysSinceCommit,
      ahead,
      behind,
      merged
    };
    
    if (merged) {
      categories.merged.push(branchInfo);
    } else if (branch.date < ninetyDaysAgo) {
      categories.stale.push(branchInfo);
    } else if (behind > 50 && branch.date < sixtyDaysAgo) {
      categories.outdated.push(branchInfo);
    } else if (branch.date > thirtyDaysAgo) {
      categories.recent.push(branchInfo);
    } else {
      categories.workInProgress.push(branchInfo);
    }
  });
  
  return categories;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function generateReport(categories) {
  const report = [];
  
  report.push('# Branch Analysis Report');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');
  
  // Summary
  report.push('## Summary');
  report.push('');
  report.push(`- **Merged branches (safe to delete):** ${categories.merged.length}`);
  report.push(`- **Stale branches (90+ days old):** ${categories.stale.length}`);
  report.push(`- **Outdated branches (behind main, 60+ days):** ${categories.outdated.length}`);
  report.push(`- **Work in progress (30-90 days):** ${categories.workInProgress.length}`);
  report.push(`- **Recent branches (< 30 days):** ${categories.recent.length}`);
  report.push('');
  
  // Recommendations
  report.push('## Recommendations');
  report.push('');
  report.push('### High Priority: Branches to Delete');
  report.push('');
  report.push('These branches have been merged into main and can be safely deleted:');
  report.push('');
  
  if (categories.merged.length === 0) {
    report.push('*No merged branches found.*');
  } else {
    report.push('| Branch | Last Commit | Days Old | Behind Main |');
    report.push('|--------|-------------|----------|-------------|');
    categories.merged
      .sort((a, b) => b.daysSinceCommit - a.daysSinceCommit)
      .forEach(branch => {
        report.push(`| ${branch.name} | ${formatDate(branch.date)} | ${branch.daysSinceCommit} | ${branch.behind} |`);
      });
  }
  report.push('');
  
  // Stale branches
  report.push('### Medium Priority: Stale Branches (90+ days old)');
  report.push('');
  report.push('These branches haven\'t been updated in 90+ days. Review if they\'re still needed:');
  report.push('');
  
  if (categories.stale.length === 0) {
    report.push('*No stale branches found.*');
  } else {
    report.push('| Branch | Last Commit | Days Old | Behind Main | Subject |');
    report.push('|--------|-------------|----------|-------------|---------|');
    categories.stale
      .sort((a, b) => b.daysSinceCommit - a.daysSinceCommit)
      .forEach(branch => {
        const subject = branch.subject.substring(0, 50);
        report.push(`| ${branch.name} | ${formatDate(branch.date)} | ${branch.daysSinceCommit} | ${branch.behind} | ${subject} |`);
      });
  }
  report.push('');
  
  // Outdated branches
  report.push('### Low Priority: Outdated Branches');
  report.push('');
  report.push('These branches are behind main and older than 60 days. Consider rebasing or closing:');
  report.push('');
  
  if (categories.outdated.length === 0) {
    report.push('*No outdated branches found.*');
  } else {
    report.push('| Branch | Last Commit | Days Old | Behind Main | Subject |');
    report.push('|--------|-------------|----------|-------------|---------|');
    categories.outdated
      .sort((a, b) => b.behind - a.behind)
      .forEach(branch => {
        const subject = branch.subject.substring(0, 50);
        report.push(`| ${branch.name} | ${formatDate(branch.date)} | ${branch.daysSinceCommit} | ${branch.behind} | ${subject} |`);
      });
  }
  report.push('');
  
  // Work in progress
  report.push('### Work in Progress (Review Needed)');
  report.push('');
  report.push('These branches are 30-90 days old. Review their status:');
  report.push('');
  
  if (categories.workInProgress.length === 0) {
    report.push('*No work-in-progress branches found.*');
  } else {
    report.push('| Branch | Last Commit | Days Old | Behind Main | Subject |');
    report.push('|--------|-------------|----------|-------------|---------|');
    categories.workInProgress
      .sort((a, b) => b.daysSinceCommit - a.daysSinceCommit)
      .forEach(branch => {
        const subject = branch.subject.substring(0, 50);
        report.push(`| ${branch.name} | ${formatDate(branch.date)} | ${branch.daysSinceCommit} | ${branch.behind} | ${subject} |`);
      });
  }
  report.push('');
  
  // Recent branches
  report.push('### Recent Branches (Active Development)');
  report.push('');
  report.push('These branches are actively being worked on (< 30 days old):');
  report.push('');
  
  if (categories.recent.length === 0) {
    report.push('*No recent branches found.*');
  } else {
    report.push('| Branch | Last Commit | Days Old | Behind Main | Subject |');
    report.push('|--------|-------------|----------|-------------|---------|');
    categories.recent
      .sort((a, b) => a.daysSinceCommit - b.daysSinceCommit)
      .forEach(branch => {
        const subject = branch.subject.substring(0, 50);
        report.push(`| ${branch.name} | ${formatDate(branch.date)} | ${branch.daysSinceCommit} | ${branch.behind} | ${subject} |`);
      });
  }
  report.push('');
  
  // Instructions
  report.push('## How to Delete Branches');
  report.push('');
  report.push('### Delete a single branch:');
  report.push('```bash');
  report.push('git push origin --delete <branch-name>');
  report.push('```');
  report.push('');
  report.push('### Delete multiple branches (example):');
  report.push('```bash');
  report.push('# Delete merged branches');
  if (categories.merged.length > 0) {
    const exampleBranches = categories.merged.slice(0, 3).map(b => b.name);
    exampleBranches.forEach(name => {
      report.push(`git push origin --delete ${name}`);
    });
  }
  report.push('```');
  report.push('');
  
  return report.join('\n');
}

// Main execution
console.log('WovenWebApp Branch Analysis Tool');
console.log('=================================\n');

try {
  // Ensure we have the latest from origin
  console.log('Fetching latest changes from origin...');
  exec('git fetch --all --prune');
  
  const branches = getBranchInfo();
  console.log(`Found ${branches.length} remote branches\n`);
  
  const mainDate = getMainCommitDate();
  console.log(`Main branch last updated: ${formatDate(mainDate)}\n`);
  
  console.log('Analyzing branches (this may take a moment)...\n');
  const categories = categorizeBranches(branches, mainDate);
  
  const report = generateReport(categories);
  
  // Write report to file
  const reportPath = 'BRANCH_ANALYSIS_REPORT.md';
  fs.writeFileSync(reportPath, report);
  
  console.log(`Report generated: ${reportPath}\n`);
  console.log('Quick Summary:');
  console.log(`  - Merged (can delete): ${categories.merged.length}`);
  console.log(`  - Stale (90+ days): ${categories.stale.length}`);
  console.log(`  - Outdated (60+ days): ${categories.outdated.length}`);
  console.log(`  - Work in progress: ${categories.workInProgress.length}`);
  console.log(`  - Recent: ${categories.recent.length}`);
  console.log(`\nSee ${reportPath} for detailed information.`);
  
} catch (error) {
  console.error('Error analyzing branches:', error.message);
  process.exit(1);
}
