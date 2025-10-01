# Developer Session Export Feature

## Overview

A hidden developer-only feature has been added to the ChatClient component that allows DH Cross to export comprehensive session data for research purposes. This feature is completely invisible to regular users and requires authentication.

## Access Methods

### Authentication
1. **Primary**: Automatically authenticated if logged in as DHCross via Auth0
2. **Fallback**: Manual login with credentials:
   - Username: `DHCross`
   - Password: `RAVENCALDER`

### Activation
1. Press `Ctrl+Shift+D` to toggle developer mode
2. Authentication prompt will appear if not already authenticated
3. Visual indicator (🔧 DEV) appears in header when active

### Export Options
- `Ctrl+Shift+S` - Export session data as JSON
- `Ctrl+Shift+P` - Export session data as PDF report

## Data Exported

### JSON Export
Comprehensive research data including:
- **Metadata**: Session ID, timestamps, message counts, user info
- **Session Diagnostics**: Full SST analysis from ping-tracker
- **Resonance Stats**: WB/ABE/OSR counts, accuracy rates, edge capture
- **Message Transcript**: All user/Raven interactions (HTML stripped)
- **Feedback Data**: All user resonance feedback (yes/no/maybe/unclear)
- **Report Contexts**: Uploaded reports and their metadata
- **Session Flags**: Has mirror data, relocation status, etc.

### PDF Export
Research-grade formatted report with:
- **Session Overview**: Key statistics in visual cards
- **Resonance Analysis**: WB/ABE/OSR breakdown with percentages
- **Session Transcript**: First 10 messages (truncated for readability)
- **Feedback Data**: Sample of user feedback with timestamps
- **Technical Metadata**: Session details and configuration

## Research Applications

This export functionality supports the backend logging contract by providing:

1. **Case Study Material**: Complete session data for research analysis
2. **"Uncanny" Session Identification**: High-resonance sessions for deep study
3. **Meta-Analysis Data**: Cross-session pattern recognition
4. **Lexicon Validation**: Testing which symbolic terms resonate
5. **Drift Detection**: Sidereal vs tropical preference analysis

## File Naming Convention

- **JSON**: `raven-dev-session-[8-char-id]-[timestamp].json`
- **PDF**: `raven-dev-session-[8-char-id]-[date].pdf`

## Privacy & Security

- **Developer-only**: Hidden from all users except authenticated developer
- **No PII exposure**: Uses opaque session IDs
- **Local storage**: No server-side data retention
- **Research purpose**: Explicitly marked as research data

## Technical Implementation

### Files Modified
- `components/ChatClient.tsx` - Added dev mode state, authentication, export functions
- Header component updated with visual indicator
- PDF generation using html2pdf library with fallback to browser print

### Dependencies
- Uses existing `ping-tracker.ts` for SST data
- Leverages existing message state and session management
- Optional html2pdf library for PDF generation

## Usage Instructions for DH Cross

1. **Enable Dev Mode**: Press `Ctrl+Shift+D` during any chat session
2. **Authenticate**: Use fallback credentials if Auth0 not working
3. **Export Data**:
   - `Ctrl+Shift+S` for detailed JSON research data
   - `Ctrl+Shift+P` for formatted PDF report
4. **Session Analysis**: Use exported data for meta-analysis and case studies

## Data Schema Alignment

The exported data aligns with the backend logging contract:
- Maps to `Session` entity schema
- Includes `Item` records for each resonance test
- Supports "uncanny" session flagging
- Provides Actor/Role inference data
- Contains drift analysis metrics

## Future Enhancements

- Google Drive integration for automatic research backup
- Batch export for multiple sessions
- Advanced filtering (uncanny sessions only, high-drift sessions, etc.)
- Integration with proposed admin dashboard

---

*This feature turns every user interaction into research data while maintaining complete transparency about the research purpose and preserving user agency.*