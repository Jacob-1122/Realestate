import { useState, useEffect } from 'react';
import { useFMRData } from './useFMRData';
import { useBatchCensusData } from './useBatchCensusData';

export interface ZipFMRData {
  zipCode: string;
  fmr_0: number;
  fmr_1: number;
  fmr_2: number;
  fmr_3: number;
  fmr_4: number;
  county?: string;
  metroAreaName?: string;
  medianHomeValue?: number;
  investmentScore?: number;
  investmentGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  loading: boolean;
  error: boolean;
}

/**
 * Calculate investment score based on FMR-to-price ratio
 */
function calculateInvestmentScore(fmr3br: number, medianHomeValue: number): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F' } {
  if (medianHomeValue <= 0 || fmr3br <= 0) {
    return { score: 50, grade: 'C' };
  }

  const monthlyRatio = fmr3br / medianHomeValue;
  
  let score = 50;
  if (monthlyRatio >= 0.02) score = 95;
  else if (monthlyRatio >= 0.015) score = 80;
  else if (monthlyRatio >= 0.01) score = 60;
  else if (monthlyRatio >= 0.008) score = 45;
  else score = 30;
  
  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';
  
  return { score: Math.round(score), grade };
}

/**
 * Hook to manage Texas ZIP code data for heat map
 * Loads FMR data from CSV and Census data for investment scoring
 */
export function useTexasZipData(_visibleZips: string[]) {
  const [zipDataMap, setZipDataMap] = useState<Map<string, ZipFMRData>>(new Map());
  const [texasZipCodes, setTexasZipCodes] = useState<string[]>([]);
  const { zipData, loading: fmrLoading, error: fmrError } = useFMRData();
  const { data: censusData, loading: censusLoading, loadedCount, totalCount } = useBatchCensusData(texasZipCodes);

  // Extract Texas ZIP codes from FMR data
  useEffect(() => {
    if (fmrLoading || fmrError || zipData.length === 0) return;
    if (texasZipCodes.length > 0) return; // Already extracted

    const txZips: string[] = [];
    zipData.forEach(zip => {
      const zipNum = parseInt(zip.zipCode);
      if (zipNum >= 75000 && zipNum < 80000) {
        txZips.push(zip.zipCode);
      }
    });

    console.log(`📍 Found ${txZips.length} Texas ZIP codes, initiating Census batch fetch...`);
    setTexasZipCodes(txZips);
  }, [zipData, fmrLoading, fmrError]);

  // Build combined map with FMR and Census data
  useEffect(() => {
    if (fmrLoading || fmrError || zipData.length === 0) return;
    if (texasZipCodes.length === 0) return;

    // Build map from CSV data
    const newDataMap = new Map<string, ZipFMRData>();
    
    zipData.forEach(zip => {
      const zipNum = parseInt(zip.zipCode);
      if (zipNum >= 75000 && zipNum < 80000) {
        const medianHomeValue = censusData[zip.zipCode]?.medianHomeValue;
        const { score, grade } = medianHomeValue 
          ? calculateInvestmentScore(zip.safmr3br, medianHomeValue)
          : { score: undefined, grade: undefined };

        newDataMap.set(zip.zipCode, {
          zipCode: zip.zipCode,
          fmr_0: zip.safmr0br,
          fmr_1: zip.safmr1br,
          fmr_2: zip.safmr2br,
          fmr_3: zip.safmr3br,
          fmr_4: zip.safmr4br,
          metroAreaName: zip.metroAreaName,
          medianHomeValue,
          investmentScore: score,
          investmentGrade: grade,
          loading: false,
          error: false,
        });
      }
    });

    const withScores = Array.from(newDataMap.values()).filter(z => z.investmentScore).length;
    console.log(`📊 Built map: ${newDataMap.size} ZIPs, ${withScores} with investment scores (${loadedCount}/${totalCount} Census data loaded)`);
    setZipDataMap(newDataMap);
  }, [zipData, fmrLoading, fmrError, censusData, loadedCount, totalCount, texasZipCodes.length]);

  return {
    zipDataMap,
    loading: fmrLoading || (censusLoading && loadedCount === 0),
    censusLoading,
    censusProgress: { loaded: loadedCount, total: totalCount },
    getZipData: (zip: string) => zipDataMap.get(zip),
  };
}

