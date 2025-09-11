# Poetic Brain

A modular, stateless narrative engine for WovenWebApp reports.

## Usage

```ts
import { generateSection } from 'poetic-brain';
const result = generateSection('MirrorVoice', payload);
```

## API Contract
- **Input:** Structured JSON payload matching WovenWebApp skeletons
- **Output:** Narrative string for the requested section

## Example Payload
```json
{
  "geometry": {"type": "circle", "radius": 5},
  "tokens": ["🌕", "🌑"],
  "descriptors": ["harmonious", "volatile"],
  "placeholders": {"MirrorVoice": ""}
}
```

## Integration
- No global state, no astrology math, no side effects
- Ready for Node module or serverless deployment

## Testing
- See `test/generateSection.test.ts` for usage and contract
