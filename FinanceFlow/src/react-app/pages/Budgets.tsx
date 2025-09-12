import { useEffect, useState } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate } from 'react-router';
import Layout from '@/react-app/components/Layout';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import BudgetModal from '@/react-app/components/BudgetModal';
import { Budget } from '@/shared/types';
import { Plus, Target } from 'lucide-react';

export default function Budgets() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isPending && !user) {
      navigate('/');
      return;
    }

    if (user) {
      fetchBudgets();
    }
  }, [user, isPending, navigate]);

  const fetchBudgets = async () => {
    try {
      const response = await fetch('/api/budgets');
      if (response.ok) {
        const data = await response.json();
        setBudgets(data);
      }
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetCreated = (newBudget: Budget) => {
    setBudgets([newBudget, ...budgets]);
    setShowModal(false);
  };

  if (isPending || loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoadingSpinner />;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPeriodLabel = (period: string) => {
    return period.charAt(0).toUpperCase() + period.slice(1);
  };

  const activeBudgets = budgets.filter(budget => budget.is_active);
  const inactiveBudgets = budgets.filter(budget => !budget.is_active);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
            <p className="text-gray-600 mt-1">Set and track your spending goals</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Budget
          </button>
        </div>

        {/* Active Budgets */}
        {activeBudgets.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Active Budgets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBudgets.map((budget) => (
                <div key={budget.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Target className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{budget.name}</h3>
                        <p className="text-sm text-gray-500">{getPeriodLabel(budget.period)} budget</p>
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Budget Amount</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(budget.amount)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Period</span>
                      <span className="text-sm text-gray-900">{getPeriodLabel(budget.period)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Start Date</span>
                      <span className="text-sm text-gray-900">{formatDate(budget.start_date)}</span>
                    </div>

                    {budget.end_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">End Date</span>
                        <span className="text-sm text-gray-900">{formatDate(budget.end_date)}</span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar placeholder */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-medium text-gray-900">0%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatCurrency(0)} of {formatCurrency(budget.amount)} spent
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inactive Budgets */}
        {inactiveBudgets.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Inactive Budgets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inactiveBudgets.map((budget) => (
                <div key={budget.id} className="bg-gray-50 rounded-2xl p-6 shadow-lg border border-gray-200 opacity-75">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                        <Target className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-700">{budget.name}</h3>
                        <p className="text-sm text-gray-500">{getPeriodLabel(budget.period)} budget</p>
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Budget Amount</span>
                      <span className="font-semibold text-gray-700">{formatCurrency(budget.amount)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Start Date</span>
                      <span className="text-sm text-gray-700">{formatDate(budget.start_date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {budgets.length === 0 && (
          <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-100 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Create Your First Budget</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Budgets help you set spending limits and track your progress toward financial goals. 
              Start by creating a monthly budget for your most common expenses.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create Budget
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <BudgetModal
          onClose={() => setShowModal(false)}
          onBudgetCreated={handleBudgetCreated}
        />
      )}
    </Layout>
  );
}
