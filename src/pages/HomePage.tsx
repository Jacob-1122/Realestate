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

  // Pause auto-scroll on mobile to prevent interference with touch
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // On mobile, pause auto-scroll
        return;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center py-8 sm:py-12">
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section with Integrated Features */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 px-2">
              Section 8 Investment Analyzer
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto px-4 mb-8 sm:mb-12">
              Discover profitable real estate opportunities with data-driven insights
            </p>
          
          {/* Powerful Features Carousel - Integrated in Hero */}
          <div className="relative bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-6 sm:p-8 lg:p-12 max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-4 sm:mb-6 lg:mb-8">
              Powerful Features
            </h2>
            
            {/* Feature Content */}
            <div className="flex flex-col items-center text-center min-h-[180px] sm:min-h-[200px] lg:min-h-[220px] justify-center">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 sm:mb-6 ${getColorClasses(features[currentFeature].color)}`}>
                {features[currentFeature].icon}
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 px-2">
                {features[currentFeature].title}
              </h3>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-300 max-w-sm sm:max-w-md px-2">
                {features[currentFeature].description}
              </p>
            </div>

            {/* Navigation Arrows - Hidden on mobile */}
            <button
              onClick={prevFeature}
              className="hidden sm:block absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Previous feature"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={nextFeature}
              className="hidden sm:block absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Next feature"
            >
              <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-4 sm:mt-6">
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

            {/* Mobile Touch Controls */}
            <div className="sm:hidden absolute inset-0 flex items-center justify-between px-4">
              <button
                onClick={prevFeature}
                className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md"
                aria-label="Previous feature"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={nextFeature}
                className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md"
                aria-label="Next feature"
              >
                <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Main Action Cards - Below Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* ZIP Code Lookup */}
          <button
            onClick={() => navigate('/search')}
            className="group bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-6 lg:p-8 hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] sm:hover:scale-105 text-left"
          >
            <div className="flex flex-col h-full">
              <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                <Search className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
                ZIP Code Lookup
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 flex-grow">
                Deep dive into any ZIP code with comprehensive investment metrics, FMR data, crime statistics, and market analysis
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <span className="px-2.5 sm:px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs sm:text-sm font-medium">
                  FMR Analysis
                </span>
                <span className="px-2.5 sm:px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs sm:text-sm font-medium">
                  Crime Stats
                </span>
                <span className="px-2.5 sm:px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs sm:text-sm font-medium">
                  Investment Score
                </span>
              </div>
            </div>
          </button>

          {/* Texas Heat Map */}
          <button
            onClick={() => navigate('/heatmap')}
            className="group bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-6 lg:p-8 hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] sm:hover:scale-105 text-left"
          >
            <div className="flex flex-col h-full">
              <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                <MapIcon className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
                Texas Heat Map
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 flex-grow">
                Visualize all Texas ZIP codes at once, color-coded by Fair Market Rent. Quickly identify high-value areas across the state
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <span className="px-2.5 sm:px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs sm:text-sm font-medium">
                  FMR Visualization
                </span>
                <span className="px-2.5 sm:px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs sm:text-sm font-medium">
                  Interactive Map
                </span>
                <span className="px-2.5 sm:px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs sm:text-sm font-medium">
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
