import { useState } from 'react';
import { Search } from 'lucide-react';
import { isValidZipCode } from '../utils/apiHelpers';

interface ZipCodeSearchProps {
  onSearch: (zipCode: string) => void;
  loading?: boolean;
}

export function ZipCodeSearch({ onSearch, loading = false }: ZipCodeSearchProps) {
  const [zipCode, setZipCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!zipCode) {
      setError('Please enter a ZIP code');
      return;
    }

    if (!isValidZipCode(zipCode)) {
      setError('Please enter a valid 5-digit US ZIP code');
      return;
    }

    setError('');
    onSearch(zipCode);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setZipCode(value);
    if (error) setError('');
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={zipCode}
            onChange={handleChange}
            placeholder="Enter ZIP code (e.g., 90210)"
            className="w-full px-6 py-4 text-2xl font-semibold text-center border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary dark:bg-gray-800 dark:text-white transition-all"
            disabled={loading}
            maxLength={5}
          />
          {zipCode && isValidZipCode(zipCode) && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          )}
        </div>
        
        {error && (
          <div className="text-red-500 text-center text-sm font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !zipCode}
          className="w-full py-4 bg-primary text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Analyzing...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Analyze Market
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Enter a 5-digit US ZIP code to view Section 8 investment analysis</p>
      </div>
    </div>
  );
}

