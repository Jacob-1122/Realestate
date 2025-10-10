# Section 8 Investment Analyzer

A comprehensive web application for analyzing Section 8 rental property investments using HUD Fair Market Rent data, crime statistics, and advanced investment metrics.

## Features

### Core Functionality
- **ZIP Code Analysis**: Search any US ZIP code for detailed investment analysis
- **Fair Market Rent Data**: View HUD FMR rates for all bedroom sizes (Studio through 4BR)
- **Crime Statistics**: County-level crime data with violent and property crime rates
- **Investment Score**: Composite 0-100 score based on multiple factors
- **Market Metrics**: Property price estimates, rent-to-price ratios, and recommendations

### Advanced Features
- **Interactive Maps**: View property locations with Leaflet/OpenStreetMap
- **Data Visualization**: Charts showing rent comparisons and trends
- **Watchlist**: Save and track multiple ZIP codes
- **Comparison Tool**: Compare 2-3 ZIP codes side-by-side
- **PDF Export**: Generate printable investment reports
- **Dark Mode**: Toggle between light and dark themes
- **Search History**: Quick access to recently searched ZIP codes
- **Data Caching**: 30-day cache for faster subsequent searches

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Maps**: React Leaflet
- **PDF Generation**: jsPDF
- **Icons**: Lucide React
- **Build Tool**: Vite

## APIs Used (All Free)

1. **HUD Fair Market Rent API** - No API key required
2. **OpenStreetMap Nominatim** - Free geocoding
3. **Mock Crime Data** - In production, integrate FBI Crime Data Explorer API

## Getting Started

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
cd section8-investment-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

## Usage Guide

### Analyzing a ZIP Code

1. Enter a 5-digit US ZIP code in the search box
2. Click "Analyze Market" or press Enter
3. View comprehensive analysis including:
   - Investment rating (0-100 score with letter grade)
   - Fair Market Rent rates for all bedroom sizes
   - Crime statistics for the area
   - Key investment metrics
   - Interactive map
   - Market context

### Understanding the Investment Score

The investment score (0-100) is calculated using:

- **FMR-to-Price Ratio (40%)**: Based on the 2% rule
  - 2.0%+ monthly = 100 points
  - 1.5-2.0% = 75 points
  - 1.0-1.5% = 50 points
  - <1.0% = 25 points

- **Crime Safety (40%)**: Compared to national averages
  - Lower crime rates = higher scores
  - Violent crime weighted more heavily than property crime

- **Population Density (20%)**: Higher density = more rental demand
  - 5000+ people/sq mi = 100 points
  - Urban/suburban areas score higher

### Investment Recommendations

- **Excellent (Score 80+)**: Strong investment opportunity
- **Good (Score 60-79)**: Viable investment with good potential
- **Fair (Score 40-59)**: Marginal investment, requires careful analysis
- **Avoid (Score <40)**: Poor investment opportunity

### Using the Watchlist

1. After analyzing a ZIP code, click "Save to Watchlist"
2. Access your watchlist from the home screen
3. Click any saved ZIP to view its analysis again
4. Remove items by clicking the trash icon

### Comparing ZIP Codes

1. Click "Compare ZIP Codes" from the home screen
2. Enter 2-3 ZIP codes
3. Click "Compare" to see side-by-side metrics

### Exporting Reports

- Click "Export PDF Report" to download a printable analysis
- PDF includes all metrics, FMR data, crime stats, and market context

## Data Sources

- **HUD User**: Fair Market Rent data
- **OpenStreetMap**: Geocoding and mapping
- **FBI Crime Data Explorer**: Crime statistics (mock data in current version)

## Important Disclaimers

⚠️ **This tool provides estimated investment metrics for informational purposes only.**

- Always conduct thorough due diligence before making investment decisions
- Consult with financial advisors and real estate professionals
- Property prices are estimated based on rent-to-price ratios
- Crime data may not reflect recent trends
- Section 8 acceptance varies by landlord and property
- Local market conditions can vary significantly within ZIP codes

## Project Structure

```
src/
├── components/       # React components
│   ├── ZipCodeSearch.tsx
│   ├── DashboardLayout.tsx
│   ├── FMRDisplay.tsx
│   ├── CrimeStats.tsx
│   ├── InvestmentScore.tsx
│   ├── MarketMetrics.tsx
│   ├── FMRChart.tsx
│   ├── MarketContext.tsx
│   ├── ZipCodeMap.tsx
│   ├── Watchlist.tsx
│   ├── ComparisonTool.tsx
│   └── PDFExport.tsx
├── hooks/           # Custom React hooks
│   ├── useHUDData.ts
│   ├── useCrimeData.ts
│   ├── useZipCodeLookup.ts
│   └── useLocalStorage.ts
├── utils/           # Utility functions
│   ├── scoreCalculator.ts
│   ├── apiHelpers.ts
│   └── dataTransformers.ts
├── types/           # TypeScript types
│   └── index.ts
├── App.tsx          # Main app component
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Future Enhancements

- [ ] Real FBI Crime Data API integration
- [ ] Zillow/Realty Mole API for actual property prices
- [ ] Historical FMR trend charts (5-year data)
- [ ] Cash flow calculator with expenses
- [ ] Email alerts for FMR updates
- [ ] Neighborhood demographics data
- [ ] School district ratings
- [ ] User accounts and cloud sync
- [ ] Mobile app version

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please open an issue on GitHub.

---

**Made with ❤️ for real estate investors**

