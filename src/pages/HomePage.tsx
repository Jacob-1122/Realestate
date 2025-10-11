import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { MapIcon, Search, TrendingUp, DollarSign, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Navbar } from '../components/Navbar';

const features = [
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: 'Real Data',
    description: 'HUD FMR, Census Bureau, and crime statistics',
    color: 'blue',
  },
  {
    icon: <DollarSign className="w-8 h-8" />,
    title: 'Cash Flow Calculator',
    description: 'Calculate max purchase price for desired returns',
    color: 'green',
  },
  {
    icon: <TrendingUp className="w-8 h-8" />,
    title: 'Investment Scoring',
    description: 'Smart algorithms rate every location A-F',
    color: 'purple',
  },
  {
    icon: <MapIcon className="w-8 h-8" />,
    title: 'Interactive Maps',
    description: 'Visualize data geographically across Texas',
    color: 'orange',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [currentFeature, setCurrentFeature] = useState(0);

  // Auto-scroll features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);

  const nextFeature = () => {
    setCurrentFeature((prev) => (prev + 1) % features.length);
  };

  const prevFeature = () => {
    setCurrentFeature((prev) => (prev - 1 + features.length) % features.length);
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            Section 8 Investment Analyzer
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Discover profitable real estate opportunities with data-driven insights
          </p>
        </div>

        {/* Powerful Features Carousel */}
        <div className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-6 sm:mb-8">
            Powerful Features
          </h2>
          
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-12 max-w-3xl mx-auto">
            {/* Feature Content */}
            <div className="flex flex-col items-center text-center min-h-[200px] sm:min-h-[220px] justify-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${getColorClasses(features[currentFeature].color)}`}>
                {features[currentFeature].icon}
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {features[currentFeature].title}
              </h3>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-md">
                {features[currentFeature].description}
              </p>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevFeature}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Previous feature"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={nextFeature}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Next feature"
            >
              <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFeature(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentFeature
                      ? 'bg-primary w-8'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-label={`Go to feature ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* ZIP Code Lookup */}
          <button
            onClick={() => navigate('/search')}
            className="group bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 text-left"
          >
            <div className="flex flex-col h-full">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                <Search className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                ZIP Code Lookup
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">
                Deep dive into any ZIP code with comprehensive investment metrics, FMR data, crime statistics, and market analysis
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                  FMR Analysis
                </span>
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                  Crime Stats
                </span>
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                  Investment Score
                </span>
              </div>
            </div>
          </button>

          {/* Texas Heat Map */}
          <button
            onClick={() => navigate('/heatmap')}
            className="group bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 text-left"
          >
            <div className="flex flex-col h-full">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                <MapIcon className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Texas Heat Map
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 flex-grow">
                Visualize all Texas ZIP codes at once, color-coded by Fair Market Rent. Quickly identify high-value areas across the state
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                  FMR Visualization
                </span>
                <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                  Interactive Map
                </span>
                <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                  Quick Overview
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
