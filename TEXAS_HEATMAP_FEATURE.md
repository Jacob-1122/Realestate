# Texas ZIP Code Heat Map Feature

## Overview
The Texas Heat Map is an interactive visualization tool that displays all Texas ZIP codes color-coded by Fair Market Rent (FMR) values. This feature allows investors to quickly identify high-value areas across the entire state.

## Features

### 🗺️ Interactive Map
- **Full Texas Coverage**: View all Texas ZIP codes in one interactive map
- **Color-Coded by FMR**: ZIP codes are colored based on FMR values
  - 🟢 Green: High FMR ($2,000+)
  - 🟡 Yellow/Orange: Medium FMR ($750-$2,000)
  - 🔴 Red: Low FMR (Under $750)
  - ⚪ Gray: No data available

### 🎯 Smart Controls
- **View Selector**: Toggle between 2BR, 3BR, or 4BR FMR data
- **Interactive Legend**: Color scale reference for easy interpretation
- **Zoom & Pan**: Explore Texas at any zoom level

### 💡 Rich Tooltips
Hover over any ZIP code to see:
- Studio (0BR) FMR
- 1 Bedroom FMR
- 2 Bedroom FMR
- **3 Bedroom FMR** (highlighted)
- 4 Bedroom FMR

### 🔗 Seamless Integration
- **Click-to-Analyze**: Click any ZIP on the map to jump to the full detailed analysis
- **Back Button**: Easily return to the main search interface

## How to Use

1. **Access the Heat Map**
   - From the home screen, click the "Texas Heat Map" button

2. **Explore the Map**
   - Use mouse to pan around Texas
   - Scroll to zoom in/out
   - Hover over ZIP codes to see FMR data in tooltips

3. **Change View**
   - Use the dropdown in the top-right to switch between 2BR, 3BR, or 4BR FMR data

4. **Analyze a ZIP**
   - Click on any ZIP code to load the full detailed analysis
   - Returns to standard search view with that ZIP pre-loaded

5. **Return to Search**
   - Click "← Back to Search" button in top-left

## Technical Details

### Data Source
- **GeoJSON File**: `public/data/tx_texas_zip_codes_geo.min.json`
- Contains boundary data for all Texas ZIP codes
- File is loaded on-demand when heat map is opened

### Performance Optimizations
- **Lazy Loading**: Heat map component loads only when needed (8.46 KB separate chunk)
- **Memoization**: Component uses React.memo to prevent unnecessary re-renders
- **Local Caching**: FMR data cached in localStorage (24-hour expiry)
- **Suspense Boundary**: Smooth loading experience with spinner

### FMR Data Strategy
Currently, the heat map uses **estimated FMR values** based on ZIP code location and proximity to major metro areas:
- Houston area (770xx-772xx): 1.3x multiplier
- Dallas area (750xx-753xx): 1.25x multiplier
- Austin area (787xx): 1.4x multiplier
- San Antonio area (782xx): 1.1x multiplier
- Other areas: 1.0x base multiplier

**Note**: For production use, you would integrate with the HUD API to fetch real FMR data. The current implementation provides a visual preview of the feature.

### Future Enhancements
1. **Real HUD API Integration**: Batch fetch real FMR data for visible ZIPs
2. **Viewport-Based Loading**: Only load data for ZIPs currently visible on screen
3. **Additional Metrics**: Color by investment score, crime rate, or other metrics
4. **Search by City**: Allow users to search for a city and auto-zoom to that area
5. **Save Favorite Regions**: Bookmark specific map views
6. **Export Map Views**: Save heat map as image for presentations

## Files Modified/Created

### New Files
- `src/components/TexasHeatMap.tsx` - Main heat map component
- `src/hooks/useTexasZipData.ts` - Hook for managing ZIP data
- `TEXAS_HEATMAP_FEATURE.md` - This documentation

### Modified Files
- `src/App.tsx` - Added heat map view and navigation
- `src/index.css` - Added custom Leaflet tooltip styles
- `package.json` - Added @turf/turf dependency

## Dependencies
- **@turf/turf**: Geospatial helper functions
- **react-leaflet**: React wrapper for Leaflet.js
- **leaflet**: Core mapping library (already in project)

## Build Size Impact
- Main bundle reduced by ~8 KB (now 735.21 KB vs 743.00 KB)
- Heat map code split into separate 8.46 KB chunk
- Only loads when user clicks "Texas Heat Map" button
- Zero impact on initial page load performance

## Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Mobile-responsive (touch gestures supported)

---

**Built**: October 11, 2025  
**Version**: 1.0.0

