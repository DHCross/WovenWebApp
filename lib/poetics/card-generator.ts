/**
 * Poetic Index Card Generator
 * Creates portrait-format visual cards using HTML/CSS
 * Avoids expensive AI image generation APIs
 */

export interface PoeticIndexCard {
  title: string;
  poeticPhrase: string;
  poem: string[];
  mirrorPrompt: string;
  blockTimeNote: string;
  dominantPlanet: string;
  colorTheme: string;
  talismancGlyph: string;
  date: string;
  // Enhanced symbolic trace
  astroGlyphs: string[];
  transitKey?: string;
  talismancSketch: string;
  symbolDrivers: string[];
}

// Export enhanced demo card creation
export function createDemoCard(): PoeticIndexCard {
  return {
    title: "Threshold Keeper",
    poeticPhrase: "where endings birth beginnings",
    poem: [
      "At the edge of known territory",
      "symbols scatter like leaves,",
      "each one a door",
      "that opens only once.",
      "",
      "What calls you forward",
      "is already waiting inside—",
      "the question dissolves",
      "as you become the answer."
    ],
    mirrorPrompt: "What threshold are you crossing that requires you to become someone new?",
    blockTimeNote: "SYMBOLIC WEATHER: Transition patterns indicating boundary dissolution",
    date: new Date().toLocaleDateString(),
    dominantPlanet: 'pluto',
    colorTheme: 'pluto',
    talismancGlyph: '♇',
    astroGlyphs: ['♇', '♄', '♆'], // Pluto, Saturn, Neptune - transformation, structure, dissolution
    transitKey: 'PLUTO-SATURN TRINE: Structured transformation through symbolic dissolution',
    talismancSketch: '⚡', // Lightning for breakthrough/transformation
    symbolDrivers: ['🟣', '⚫', '🔴'] // Purple (Pluto), Black (Saturn), Red (Mars/action)
  };
}

export const CARD_THEMES = {
  mars: {
    background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
    textColor: '#ffffff',
    accentColor: '#ffed4e'
  },
  sun: {
    background: 'linear-gradient(135deg, #ff8a00 0%, #e52e71 100%)',
    textColor: '#ffffff', 
    accentColor: '#ffd700'
  },
  moon: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textColor: '#ffffff',
    accentColor: '#e0e7ff'
  },
  neptune: {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    textColor: '#ffffff',
    accentColor: '#b3e5fc'
  },
  saturn: {
    background: 'linear-gradient(135deg, #6c7b7f 0%, #99a9b5 100%)',
    textColor: '#ffffff',
    accentColor: '#e8eaf6'
  },
  chiron: {
    background: 'linear-gradient(135deg, #8360c3 0%, #2ebf91 100%)',
    textColor: '#ffffff',
    accentColor: '#f3e5f5'
  },
  jupiter: {
    background: 'linear-gradient(135deg, #2c3e50 0%, #4a6741 100%)',
    textColor: '#ffffff',
    accentColor: '#81c784'
  },
  venus: {
    background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    textColor: '#2c3e50',
    accentColor: '#ff8a80'
  },
  mercury: {
    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    textColor: '#2c3e50',
    accentColor: '#4fc3f7'
  },
  uranus: {
    background: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
    textColor: '#2c3e50',
    accentColor: '#ab47bc'
  },
  pluto: {
    background: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
    textColor: '#ffffff',
    accentColor: '#ff6b6b'
  }
};

export const TALISMAN_GLYPHS = {
  mars: '♂',
  sun: '☉', 
  moon: '☽',
  neptune: '♆',
  saturn: '♄',
  chiron: '⚷',
  jupiter: '♃',
  venus: '♀',
  mercury: '☿',
  uranus: '♅',
  pluto: '♇'
};

export function generateCardHTML(card: PoeticIndexCard): string {
  const theme = CARD_THEMES[card.dominantPlanet as keyof typeof CARD_THEMES] || CARD_THEMES.moon;
  const glyph = TALISMAN_GLYPHS[card.dominantPlanet as keyof typeof TALISMAN_GLYPHS] || '✦';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Poetic Index Card - ${card.title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: #f0f0f0;
            padding: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: 'Inter', sans-serif;
        }
        
        .card {
            width: 400px;
            height: 600px;
            background: ${theme.background};
            border-radius: 12px;
            padding: 40px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            color: ${theme.textColor};
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .corner-glyph {
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 18px;
            opacity: 0.4;
            font-family: serif;
            z-index: 3;
        }
        
        .side-glyphs {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: 12px;
            opacity: 0.3;
            font-family: serif;
            z-index: 2;
        }
        
        .talisman-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 120px;
            opacity: 0.08;
            font-family: serif;
            z-index: 1;
            pointer-events: none;
        }
        
        .top-zone {
            text-align: center;
            margin-bottom: 30px;
            position: relative;
            z-index: 4;
        }
        
        .title {
            font-family: 'Crimson Text', serif;
            font-size: 22px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 12px;
            line-height: 1.2;
        }
        
        .poetic-phrase {
            font-family: 'Crimson Text', serif;
            font-size: 16px;
            font-style: italic;
            opacity: 0.9;
            letter-spacing: 0.5px;
        }
        
        .middle-zone {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
            z-index: 4;
        }
        
        .poem {
            font-family: 'Crimson Text', serif;
            font-size: 18px;
            line-height: 1.8;
            letter-spacing: 0.3px;
        }
        
        .poem-line {
            margin-bottom: 8px;
        }
        
        .bottom-zone {
            text-align: center;
            margin-top: 30px;
            position: relative;
            z-index: 4;
        }
        
        .mirror-prompt {
            font-family: 'Crimson Text', serif;
            font-size: 15px;
            font-style: italic;
            margin-bottom: 12px;
            color: ${theme.accentColor};
            line-height: 1.4;
        }
        
        .block-time-note {
            font-family: 'Inter', sans-serif;
            font-size: 11px;
            font-weight: 300;
            opacity: 0.7;
            letter-spacing: 0.5px;
            margin-bottom: 16px;
        }
        
        .transit-key {
            font-family: 'Inter', sans-serif;
            font-size: 10px;
            opacity: 0.6;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }
        
        .archive-identity {
            font-family: 'Inter', sans-serif;
            font-size: 10px;
            font-weight: 300;
            opacity: 0.6;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        
        .grain-texture {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
                radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 50%);
            border-radius: 12px;
            pointer-events: none;
            z-index: 1;
        }

        .download-controls {
            position: fixed;
            top: 20px;
            left: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        }

        .control-btn {
            background: rgba(0,0,0,0.8);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
        }

        .control-btn:hover {
            background: rgba(0,0,0,0.9);
        }

        @media print {
            body { background: white; padding: 0; }
            .download-controls { display: none; }
        }
    </style>
</head>
<body>
    <div class="download-controls">
        <button class="control-btn" onclick="downloadAsImage()">📥 Download as Image</button>
        <button class="control-btn" onclick="copyToClipboard()">📋 Copy to Clipboard</button>
    </div>

    <div class="card" id="poeticCard">
        <div class="grain-texture"></div>
        <div class="corner-glyph">${glyph}</div>
        
        <div class="side-glyphs">
            ${card.astroGlyphs.map(glyph => `<div>${glyph}</div>`).join('')}
        </div>
        
        <div class="talisman-watermark">${card.talismancSketch}</div>
        
        <div class="top-zone">
            <div class="title">${card.title}</div>
            <div class="poetic-phrase">${card.poeticPhrase}</div>
        </div>
        
        <div class="middle-zone">
            <div class="poem">
                ${card.poem.map(line => `<div class="poem-line">${line}</div>`).join('')}
            </div>
        </div>
        
        <div class="bottom-zone">
            <div class="mirror-prompt">${card.mirrorPrompt}</div>
            <div class="block-time-note">${card.blockTimeNote}</div>
            ${card.transitKey ? `<div class="transit-key">${card.transitKey}</div>` : ''}
            <div class="archive-identity">Poetic Index · Raven Calder · ${card.date}</div>
        </div>
    </div>

    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
    <script>
        async function downloadAsImage() {
            const card = document.getElementById('poeticCard');
            const canvas = await html2canvas(card, {
                backgroundColor: null,
                scale: 2,
                useCORS: true
            });
            
            const link = document.createElement('a');
            link.download = 'poetic-index-card-${card.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}-${card.date}.png';
            link.href = canvas.toDataURL();
            link.click();
        }

        async function copyToClipboard() {
            const card = document.getElementById('poeticCard');
            const canvas = await html2canvas(card, {
                backgroundColor: null,
                scale: 2,
                useCORS: true
            });
            
            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    alert('Card copied to clipboard!');
                } catch (err) {
                    console.error('Failed to copy: ', err);
                    alert('Copy failed. Try the download option instead.');
                }
            });
        }
    </script>
</body>
</html>`;
}

export function downloadCardAsImage(html: string, filename: string): void {
  // This would typically use html2canvas or similar to convert HTML to image
  // For now, we'll provide the HTML for download
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
