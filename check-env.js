console.log('RAPIDAPI_KEY present:', !!process.env.RAPIDAPI_KEY);
console.log('MB_MOCK:', process.env.MB_MOCK);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Show mock condition
const wantMock = (!process.env.RAPIDAPI_KEY || process.env.MB_MOCK === 'true') && process.env.NODE_ENV !== 'production';
console.log('Mock condition result:', wantMock);
console.log('  - No API key:', !process.env.RAPIDAPI_KEY);
console.log('  - MB_MOCK is true:', process.env.MB_MOCK === 'true');
console.log('  - Not production:', process.env.NODE_ENV !== 'production');