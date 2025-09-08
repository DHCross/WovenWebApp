import { generateSection } from '../src/index';

async function runTests() {
  const payload = {
    constitutionalClimate: 'A builder working alongside a tide-puller.',
    climateLine: 'moderate pressure band, supportive 🌞',
    hooks: ['Sun square Mars (2.1°)', 'Moon trine Venus (1.8°)']
  };

  const { text } = await generateSection('mirrorVoice', payload);
  console.log('Mirror Voice:', text);

  if (!text.includes('placeholder')) {
    throw new Error('Placeholder not returned!');
  }

  console.log('All tests passed.');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
