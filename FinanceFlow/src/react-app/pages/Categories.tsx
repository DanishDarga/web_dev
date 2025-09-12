import { useEffect, useState } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate } from 'react-router';
import Layout from '@/react-app/components/Layout';
import LoadingSpinner from '@/react-app/components/LoadingSpinner';
import CategoryModal from '@/react-app/components/CategoryModal';
import { Category } from '@/shared/types';
import { Plus, Tag, TrendingUp, TrendingDown } from 'lucide-react';

export default function Categories() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isPending && !user) {
      navigate('/');
      return;
    }

    if (user) {
      fetchCategories();
    }
  }, [user, isPending, navigate]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryCreated = (newCategory: Category) => {
    setCategories([...categories, newCategory]);
    setShowModal(false);
  };

  if (isPending || loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoadingSpinner />;
  }

  const incomeCategories = categories.filter(cat => cat.is_income);
  const expenseCategories = categories.filter(cat => !cat.is_income);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="text-gray-600 mt-1">Organize your transactions with custom categories</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Category
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Income Categories */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Income Categories</h2>
                <p className="text-sm text-gray-600">{incomeCategories.length} categories</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {incomeCategories.length > 0 ? (
                incomeCategories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{category.name}</p>
                      <p className="text-sm text-gray-500">Income category</p>
                    </div>
                    {category.icon && (
                      <span className="text-gray-400">{category.icon}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No income categories yet</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Create your first income category
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Expense Categories */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Expense Categories</h2>
                <p className="text-sm text-gray-600">{expenseCategories.length} categories</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {expenseCategories.length > 0 ? (
                expenseCategories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{category.name}</p>
                      <p className="text-sm text-gray-500">Expense category</p>
                    </div>
                    {category.icon && (
                      <span className="text-gray-400">{category.icon}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No expense categories yet</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Create your first expense category
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Add Categories */}
        {categories.length === 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Tag className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Get Started with Categories</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Categories help you organize and track your spending patterns. Create categories for different types of income and expenses.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {[
                  { name: 'Salary', color: '#10B981', isIncome: true },
                  { name: 'Groceries', color: '#F59E0B', isIncome: false },
                  { name: 'Transportation', color: '#3B82F6', isIncome: false },
                  { name: 'Entertainment', color: '#8B5CF6', isIncome: false },
                ].map((category) => (
                  <div
                    key={category.name}
                    className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-200"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">{category.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <CategoryModal
          onClose={() => setShowModal(false)}
          onCategoryCreated={handleCategoryCreated}
        />
      )}
    </Layout>
  );
}
