import { Moon, Sun, ArrowLeft } from 'lucide-react';
import { useTheme } from '../hooks/useLocalStorage';

interface DashboardLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function DashboardLayout({ children, showBackButton = false, onBack }: DashboardLayoutProps) {
  const [theme, toggleTheme] = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showBackButton && onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Section 8 Investment Analyzer
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Real estate investment analysis powered by HUD data
                </p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              ) : (
                <Sun className="w-6 h-6 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">
              <span className="font-semibold">Data Sources:</span> HUD Fair Market Rent API, FBI Crime Data Explorer, OpenStreetMap
            </p>
            <p className="text-xs">
              <span className="font-semibold">Disclaimer:</span> This tool provides estimated investment metrics for informational purposes only. 
              Always conduct thorough due diligence and consult with financial advisors before making investment decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

