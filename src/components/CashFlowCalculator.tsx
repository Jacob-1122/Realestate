import { useState, useEffect } from 'react';
import { X, Calculator, DollarSign, TrendingUp, Home } from 'lucide-react';
import { formatCurrency } from '../utils/apiHelpers';

interface CashFlowCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  fmrRent: number; // 3BR FMR from the ZIP code
  zipCode: string;
}

export function CashFlowCalculator({ isOpen, onClose, fmrRent, zipCode }: CashFlowCalculatorProps) {
  // User inputs
  const [desiredCashFlow, setDesiredCashFlow] = useState(200);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);
  const [propertyTaxRate, setPropertyTaxRate] = useState(1.2);
  const [insurance, setInsurance] = useState(100);
  const [hoa, setHoa] = useState(0);
  const [vacancy, setVacancy] = useState(8);
  const [maintenance, setMaintenance] = useState(10);
  const [propertyManagement, setPropertyManagement] = useState(10);
  
  // Calculated results
  const [maxPurchasePrice, setMaxPurchasePrice] = useState(0);
  const [monthlyMortgage, setMonthlyMortgage] = useState(0);
  const [totalMonthlyExpenses, setTotalMonthlyExpenses] = useState(0);
  const [netOperatingIncome, setNetOperatingIncome] = useState(0);
  const [cashOnCashReturn, setCashOnCashReturn] = useState(0);
  const [capRate, setCapRate] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    calculateMaxPrice();
  }, [desiredCashFlow, downPaymentPercent, interestRate, propertyTaxRate, insurance, hoa, vacancy, maintenance, propertyManagement, fmrRent, isOpen]);

  const calculateMaxPrice = () => {
    // Start with gross rent
    const monthlyRent = fmrRent;
    
    // Calculate operating expenses (as percentages of rent)
    const vacancyCost = monthlyRent * (vacancy / 100);
    const maintenanceCost = monthlyRent * (maintenance / 100);
    const pmCost = monthlyRent * (propertyManagement / 100);
    
    // Effective monthly income after vacancy
    const effectiveMonthlyIncome = monthlyRent - vacancyCost;
    
    // Available for debt service = effective income - fixed costs - desired cash flow
    const fixedOperatingCosts = insurance + hoa + maintenanceCost + pmCost;
    const availableForDebtService = effectiveMonthlyIncome - fixedOperatingCosts - desiredCashFlow;
    
    // Check if it's even possible to achieve this cash flow
    if (availableForDebtService <= 0) {
      // Not enough income to cover expenses and desired cash flow
      setMaxPurchasePrice(0);
      setMonthlyMortgage(0);
      setTotalMonthlyExpenses(fixedOperatingCosts);
      setNetOperatingIncome((monthlyRent * 12) - ((vacancyCost + maintenanceCost + pmCost + insurance + hoa) * 12));
      setCashOnCashReturn(0);
      setCapRate(0);
      return;
    }
    
    // Binary search for the maximum purchase price
    let low = 1000;
    let high = 2000000;
    let bestPrice = 0;
    
    for (let i = 0; i < 100; i++) {
      const testPrice = (low + high) / 2;
      
      // Calculate mortgage payment for this price
      const loanAmount = testPrice * (1 - downPaymentPercent / 100);
      const monthlyRate = interestRate / 100 / 12;
      const numPayments = 30 * 12;
      
      // Handle edge case where interest rate is 0
      let mortgage;
      if (monthlyRate === 0) {
        mortgage = loanAmount / numPayments;
      } else {
        mortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
      }
      
      // Calculate property tax
      const propertyTax = (testPrice * propertyTaxRate / 100) / 12;
      
      // Total debt service (mortgage + property tax)
      const debtService = mortgage + propertyTax;
      
      // Check if this price works
      if (Math.abs(debtService - availableForDebtService) < 10) {
        bestPrice = testPrice;
        break;
      }
      
      // If debt service is LESS than available, we can afford a HIGHER price
      // If debt service is MORE than available, we need a LOWER price
      if (debtService < availableForDebtService) {
        low = testPrice;
        bestPrice = testPrice;
      } else {
        high = testPrice;
      }
      
      // Prevent infinite loop if we can't find a good price
      if (high - low < 1) {
        bestPrice = low;
        break;
      }
    }
    
    // Calculate final numbers with the best price
    const loanAmount = bestPrice * (1 - downPaymentPercent / 100);
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = 30 * 12;
    
    let mortgage;
    if (monthlyRate === 0) {
      mortgage = loanAmount / numPayments;
    } else {
      mortgage = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    }
    
    const propertyTax = (bestPrice * propertyTaxRate / 100) / 12;
    const totalExpenses = mortgage + propertyTax + insurance + hoa + maintenanceCost + pmCost;
    const noi = (monthlyRent * 12) - ((vacancyCost + maintenanceCost + pmCost + insurance + hoa) * 12) - (propertyTax * 12);
    const downPayment = bestPrice * (downPaymentPercent / 100);
    const annualCashFlow = desiredCashFlow * 12;
    const cocReturn = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0;
    const capRateCalc = bestPrice > 0 ? (noi / bestPrice) * 100 : 0;
    
    setMaxPurchasePrice(bestPrice);
    setMonthlyMortgage(mortgage);
    setTotalMonthlyExpenses(totalExpenses);
    setNetOperatingIncome(noi);
    setCashOnCashReturn(cocReturn);
    setCapRate(capRateCalc);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Cash Flow Calculator
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ZIP {zipCode} • FMR: {formatCurrency(fmrRent)}/mo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Results Section */}
          <div className="bg-gradient-to-br from-primary/10 to-blue-50 dark:from-primary/20 dark:to-gray-900 rounded-lg p-6 border-2 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Maximum Purchase Price</h3>
            </div>
            <div className="text-4xl font-bold text-primary mb-2">
              {formatCurrency(maxPurchasePrice)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              To achieve {formatCurrency(desiredCashFlow)}/mo cash flow
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Inputs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Goals & Assumptions
              </h3>

              {/* Desired Cash Flow */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Desired Monthly Cash Flow
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={desiredCashFlow}
                    onChange={(e) => setDesiredCashFlow(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Down Payment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Down Payment: {downPaymentPercent}%
                </label>
                <input
                  type="range"
                  min="3"
                  max="50"
                  step="1"
                  value={downPaymentPercent}
                  onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>3%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Interest Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interest Rate: {interestRate}%
                </label>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>3%</span>
                  <span>12%</span>
                </div>
              </div>

              {/* Property Tax */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Property Tax Rate: {propertyTaxRate}% annually
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="3"
                  step="0.1"
                  value={propertyTaxRate}
                  onChange={(e) => setPropertyTaxRate(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Insurance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Insurance (Monthly)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={insurance}
                    onChange={(e) => setInsurance(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* HOA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  HOA Fees (Monthly)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={hoa}
                    onChange={(e) => setHoa(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Vacancy Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vacancy Rate: {vacancy}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={vacancy}
                  onChange={(e) => setVacancy(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Maintenance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maintenance Reserve: {maintenance}% of rent
                </label>
                <input
                  type="range"
                  min="5"
                  max="15"
                  step="1"
                  value={maintenance}
                  onChange={(e) => setMaintenance(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Property Management */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Property Management: {propertyManagement}% of rent
                </label>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={propertyManagement}
                  onChange={(e) => setPropertyManagement(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Right Column - Breakdown */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Monthly Breakdown
              </h3>

              {/* Income */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Income</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Gross Rent (FMR)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(fmrRent)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Vacancy ({vacancy}%)</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(fmrRent * vacancy / 100)}</span>
                  </div>
                  <div className="border-t border-green-200 dark:border-green-800 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white">Effective Income</span>
                    <span className="font-bold text-green-600">{formatCurrency(fmrRent * (1 - vacancy / 100))}</span>
                  </div>
                </div>
              </div>

              {/* Expenses */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Expenses</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Mortgage (P&I)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(monthlyMortgage)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Property Tax</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency((maxPurchasePrice * propertyTaxRate / 100) / 12)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Insurance</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(insurance)}</span>
                  </div>
                  {hoa > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">HOA</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(hoa)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Maintenance ({maintenance}%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(fmrRent * maintenance / 100)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Property Mgmt ({propertyManagement}%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(fmrRent * propertyManagement / 100)}</span>
                  </div>
                  <div className="border-t border-red-200 dark:border-red-800 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white">Total Expenses</span>
                    <span className="font-bold text-red-600">{formatCurrency(totalMonthlyExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* Cash Flow */}
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 dark:text-white">Monthly Cash Flow</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(desiredCashFlow)}</span>
                </div>
              </div>

              {/* Investment Metrics */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Investment Metrics
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Down Payment</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(maxPurchasePrice * downPaymentPercent / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Loan Amount</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(maxPurchasePrice * (1 - downPaymentPercent / 100))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Cash-on-Cash Return</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {cashOnCashReturn.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Cap Rate</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {capRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Annual NOI</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(netOperatingIncome)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

