const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const examplePath = path.join(projectRoot, '.env.example');

function ensureEnvFile() {
  if (fs.existsSync(envPath)) {
    console.log('Environment file found.');
    return;
  }

  if (!fs.existsSync(examplePath)) {
    console.error('Error: .env file not found and .env.example is missing.');
    console.error('Please create a .env file with the required configuration.');
    process.exit(1);
  }

  try {
    fs.copyFileSync(examplePath, envPath, fs.constants.COPYFILE_EXCL);
    console.warn('Warning: .env file was missing. A copy of .env.example has been created.');
    console.warn('Update RAPIDAPI_KEY and other secrets before deploying to production.');
  } catch (error) {
    if (error.code === 'EEXIST') {
      // Another process may have created the file between the exists check and copy.
      console.log('Environment file found.');
      return;
    }

    console.error('Error: Unable to create .env from .env.example.');
    console.error(error);
    process.exit(1);
  }
}

ensureEnvFile();
