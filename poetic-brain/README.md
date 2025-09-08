# Poetic Brain

A modular, stateless narrative engine for WovenWebApp. Fills in narrative sections (e.g., Mirror Voice, Polarity Card VOICE) using only structured payloads—no astrology math, no global state, no side effects.

## API

### `generateSection(sectionType, inputPayload)`
- **sectionType**: string (e.g. 'mirrorVoice', 'polarityCardVoice', 'climateLine', 'vectorNote')
- **inputPayload**: structured JSON matching WovenWebApp report skeletons
- **returns**: `{ text: string }`

## Example Usage
```ts
import { generateSection } from './dist/index.js';

const { text } = await generateSection('mirrorVoice', payload);
```

## Example Payload
```json
{
  "constitutionalClimate": "A builder working alongside a tide-puller.",
  "climateLine": "moderate pressure band, supportive 🌞",
  "hooks": ["Sun square Mars (2.1°)", "Moon trine Venus (1.8°)"]
}
```

## Protocol
- Accepts only structured, geometry-first payloads
- Returns only the requested narrative
- Uses approved emoji lexicon and protocol
- No astrology math, no global state, no side effects

## Testing
- Run `npm run build && npm test`
- See `test/generateSection.test.ts` for sample cases
