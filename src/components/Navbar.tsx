import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Map, Building2, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <button
            onClick={() => {
              navigate('/');
              closeMobileMenu();
            }}
            className="flex items-center space-x-2 text-xl font-bold text-gray-900 dark:text-white hover:text-primary transition-colors"
          >
            <span className="text-2xl">🏘️</span>
            <span className="hidden sm:inline">Section 8 Analyzer</span>
            <span className="sm:hidden">S8 Analyzer</span>
          </button>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-semibold transition-all ${
                isActive('/')
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>

            <button
              onClick={() => navigate('/search')}
              className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-semibold transition-all ${
                isActive('/search')
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>ZIP Lookup</span>
            </button>

            <button
              onClick={() => navigate('/metro-analysis')}
              className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-semibold transition-all ${
                isActive('/metro-analysis')
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Metro Analysis</span>
            </button>

            {/* Heat Map - Disabled */}
            <div
              className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-semibold cursor-not-allowed opacity-50 text-gray-400 dark:text-gray-500"
              title="Coming soon"
            >
              <Map className="w-4 h-4" />
              <span>Heat Map</span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button
                onClick={() => {
                  navigate('/');
                  closeMobileMenu();
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg font-semibold transition-all text-left ${
                  isActive('/')
                    ? 'bg-primary text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Home</span>
              </button>

              <button
                onClick={() => {
                  navigate('/search');
                  closeMobileMenu();
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg font-semibold transition-all text-left ${
                  isActive('/search')
                    ? 'bg-primary text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Search className="w-5 h-5" />
                <span>ZIP Code Lookup</span>
              </button>

              <button
                onClick={() => {
                  navigate('/metro-analysis');
                  closeMobileMenu();
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg font-semibold transition-all text-left ${
                  isActive('/metro-analysis')
                    ? 'bg-primary text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span>Metro Area Analysis</span>
              </button>

              {/* Heat Map - Disabled */}
              <div
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg font-semibold text-left cursor-not-allowed opacity-50 text-gray-400 dark:text-gray-500"
                title="Coming soon"
              >
                <Map className="w-5 h-5" />
                <span>Texas Heat Map</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

