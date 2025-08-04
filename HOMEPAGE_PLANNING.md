# Homepage Restructuring Plan

> **Status**: Planning Phase - Not Yet Implemented  
> **Target Date**: TBD  
> **Priority**: Medium (after current Woven Map app is stable)

## Current State
- Single-page application at root (`index.html`)
- Woven Map Math Brain app takes up entire site
- No room for additional content or professional presentation

## Proposed Architecture

### Directory Structure
```
/ (root)
├── index.html                    # New homepage
├── assets/                       # Shared assets, images, etc.
├── styles/                       # Global CSS
├── woven-map/                    # Current app moved here
│   ├── index.html               # Current Woven Map app
│   ├── config.js
│   ├── dist/
│   └── ...
├── book/                         # Book project section
│   └── index.html
└── netlify/                      # Keep functions at root
    └── functions/
```

### Page Content Plan

#### Homepage (`/index.html`)
- **Header**: Professional branding and navigation
- **Hero Section**: Brief introduction and mission statement
- **Tools Section**: Card linking to Woven Map app with description
- **Projects Section**: Book project preview and links
- **About Section**: Background on astrological geometry work
- **Contact/Links**: Professional contact information

#### Woven Map App (`/woven-map/`)
- Current application moved intact
- Maintain all functionality and API connections
- Add breadcrumb navigation back to homepage
- Keep existing URL redirects working

#### Book Section (`/book/`)
- Information about planned astrological geometry book
- Writing progress updates
- Preview chapters or concepts
- Pre-order/notification signup

## Technical Implementation

### Phase 1: Preparation
- [ ] Create new homepage design and content
- [ ] Test Woven Map app in subdirectory locally
- [ ] Update internal links and asset paths
- [ ] Design navigation system

### Phase 2: Migration
- [ ] Move current `index.html` to `/woven-map/index.html`
- [ ] Create new homepage at root
- [ ] Update Netlify configuration for new structure
- [ ] Test all functionality in new structure

### Phase 3: Deployment
- [ ] Deploy to production with redirect rules
- [ ] Monitor for broken links
- [ ] Update any external references
- [ ] SEO optimization for new structure

## Netlify Configuration Updates

### Redirects (`netlify.toml`)
```toml
# Preserve existing API routes
[[redirects]]
  from = "/api/astrology-mathbrain"
  to = "/.netlify/functions/astrology-mathbrain"
  status = 200

# Redirect old app URLs to new location (if needed)
[[redirects]]
  from = "/app"
  to = "/woven-map/"
  status = 301

# Handle SPA routing for woven-map app
[[redirects]]
  from = "/woven-map/*"
  to = "/woven-map/index.html"
  status = 200
```

## Content Strategy

### Homepage Messaging
- **Primary Value**: "Pure Astrological Geometry Computation"
- **Audience**: Astrologers, researchers, students
- **Tone**: Professional, accessible, technically accurate

### Navigation Structure
- **Home**: Landing page
- **Woven Map**: Link to the geometry app
- **Book**: Writing project information
- **About**: Background and methodology
- **Contact**: Professional connections

## Design Considerations

### Visual Consistency
- Maintain current dark theme and color scheme
- Use existing Tailwind CSS setup
- Consistent typography and spacing
- Professional but approachable aesthetic

### User Experience
- Clear navigation between sections
- Fast loading times
- Mobile-responsive design
- Accessibility compliance

## Benefits of Restructuring

### Professional Presence
- Proper homepage for first impressions
- Room for portfolio and projects
- Professional contact and bio section

### Content Expansion
- Dedicated space for book project
- Room for additional tools and resources
- Blog or updates section potential

### SEO and Discovery
- Better site structure for search engines
- Multiple pages for content targeting
- Professional domain utilization

### Scalability
- Foundation for future projects
- Modular architecture for additions
- Clear separation of concerns

## Risks and Mitigation

### Technical Risks
- **Risk**: Breaking existing bookmarks/links
- **Mitigation**: Implement proper redirects and maintain URL structure

- **Risk**: API routing issues
- **Mitigation**: Test thoroughly in development, maintain function paths

### Content Risks
- **Risk**: Diluting focus from main tool
- **Mitigation**: Keep Woven Map prominently featured, clear navigation

## Success Metrics

### Technical
- [ ] All existing functionality preserved
- [ ] No broken links or 404 errors
- [ ] Fast loading times maintained
- [ ] API endpoints working correctly

### Content
- [ ] Clear value proposition on homepage
- [ ] Easy navigation to Woven Map app
- [ ] Professional presentation
- [ ] Room for future content expansion

---

*This planning document will be updated as the project progresses.*
