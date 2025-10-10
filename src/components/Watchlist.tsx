import React from 'react';
import { Bookmark, Trash2, Star } from 'lucide-react';
import { SavedSearch } from '../types';
import { formatCurrency } from '../utils/apiHelpers';
import { getScoreColor } from '../utils/scoreCalculator';

interface WatchlistProps {
  savedSearches: SavedSearch[];
  onSelect: (zipCode: string) => void;
  onRemove: (id: string) => void;
}

export function Watchlist({ savedSearches, onSelect, onRemove }: WatchlistProps) {
  if (savedSearches.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bookmark className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Watchlist
          </h2>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No saved searches yet. Search for a ZIP code and click "Save to Watchlist" to add it here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Bookmark className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Watchlist
        </h2>
        <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">
          {savedSearches.length} saved
        </span>
      </div>

      <div className="space-y-3">
        {savedSearches.map((search) => {
          const score = search.result.investmentMetrics?.score || 0;
          const scoreColor = getScoreColor(score);
          const threeBedroomRent = search.result.fmrData?.data.fmr_3 || 0;

          return (
            <div
              key={search.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary transition-all cursor-pointer group"
              onClick={() => onSelect(search.zipCode)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {search.zipCode}
                    </span>
                    {search.nickname && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        ({search.nickname})
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4" style={{ color: scoreColor }} />
                      <span className="font-semibold" style={{ color: scoreColor }}>
                        Score: {score}
                      </span>
                    </div>
                    
                    {threeBedroomRent > 0 && (
                      <div className="text-gray-600 dark:text-gray-400">
                        3BR: {formatCurrency(threeBedroomRent)}/mo
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    Saved {new Date(search.savedAt).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(search.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

