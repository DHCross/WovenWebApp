#!/usr/bin/env node

/**
 * Copilot Instructions Verification Script
 * Validates that the GitHub Copilot setup is properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying GitHub Copilot Instructions Setup...\n');

const checks = [
  {
    name: 'Copilot Instructions File',
    check: () => fs.existsSync('.github/copilot-instructions.md'),
    pass: '✅ .github/copilot-instructions.md exists',
    fail: '❌ .github/copilot-instructions.md missing'
  },
  {
    name: 'GitHub Directory',
    check: () => fs.existsSync('.github') && fs.statSync('.github').isDirectory(),
    pass: '✅ .github directory exists',
    fail: '❌ .github directory missing'
  },
  {
    name: 'Documentation Files',
    check: () => {
      const requiredDocs = [
        'README.md',
        'MAINTENANCE_GUIDE.md',
        'CHANGELOG.md',
        'Lessons Learned for Developer.md'
      ];
      return requiredDocs.every(doc => fs.existsSync(doc));
    },
    pass: '✅ All required documentation files exist',
    fail: '❌ Missing required documentation files'
  },
  {
    name: 'Package.json Scripts',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const requiredScripts = ['build:css', 'check-env', 'dev'];
      return requiredScripts.every(script => pkg.scripts && pkg.scripts[script]);
    },
    pass: '✅ Required npm scripts are configured',
    fail: '❌ Missing required npm scripts'
  },
  {
    name: 'Environment Template',
    check: () => fs.existsSync('.env.example'),
    pass: '✅ Environment template (.env.example) exists',
    fail: '❌ Environment template missing'
  },
  {
    name: 'Gitignore Configuration',
    check: () => {
      const gitignore = fs.readFileSync('.gitignore', 'utf8');
      return gitignore.includes('copilot') || gitignore.includes('ai-temp');
    },
    pass: '✅ Gitignore includes AI/Copilot temp file exclusions',
    fail: '❌ Gitignore missing AI temp file exclusions'
  }
];

let allPassed = true;

checks.forEach(({ name, check, pass, fail }) => {
  try {
    if (check()) {
      console.log(pass);
    } else {
      console.log(fail);
      allPassed = false;
    }
  } catch (error) {
    console.log(`❌ Error checking ${name}: ${error.message}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All Copilot instructions checks passed!');
  console.log('\n📚 Key resources for AI assistants:');
  console.log('   • .github/copilot-instructions.md - Main guidance');
  console.log('   • README.md - Setup and API integration');
  console.log('   • MAINTENANCE_GUIDE.md - Best practices');
  console.log('   • "Lessons Learned for Developer.md" - AI context insights');
  console.log('\n🚀 Ready for AI-assisted development!');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please address the issues above.');
  process.exit(1);
}