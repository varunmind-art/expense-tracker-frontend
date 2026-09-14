import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const ExpenseForm = ({ isOpen, onClose, onSubmit, initialData, categories, isLoading }) => {
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    categoryId: '',
    receiptUrl: '',
    type: 'EXPENSE',
  });

  // Get selected category object
  const selectedCategory = categories.find((c) => c.id === formData.categoryId);

  useEffect(() => {
    if (initialData) {
      setFormData({
        amount: initialData.amount || '',
        date: initialData.date
          ? new Date(initialData.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        note: initialData.note || '',
        categoryId: initialData.categoryId || '',
        receiptUrl: initialData.receiptUrl || '',
        type: initialData.type || 'EXPENSE',
      });
    } else {
      const firstCat = categories[0];
      setFormData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
        categoryId: firstCat ? firstCat.id : '',
        receiptUrl: '',
        // ⭐ Auto-set from category type
        type: firstCat?.type || 'EXPENSE',
      });
    }
  }, [initialData, categories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ⭐ When the category changes, auto-set the type
  const handleCategoryChange = (e) => {
    const newCategoryId = e.target.value;
    const cat = categories.find((c) => c.id === newCategoryId);
    setFormData((prev) => ({
      ...prev,
      categoryId: newCategoryId,
      type: cat?.type || 'EXPENSE',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Please select a category.');
      return;
    }
    onSubmit({ ...formData, amount: parseFloat(formData.amount) });
  };

  if (!isOpen) return null;

  const isSavings = formData.type === 'SAVINGS';
  const categoryType = selectedCategory?.type || 'EXPENSE';
  const typeOverridden = categoryType !== formData.type;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          {initialData ? 'Edit Entry' : isSavings ? 'Add Savings' : 'Add Expense'}
        </h2>

        {/* Type Toggle (optional override) */}
        <div className="flex rounded-lg overflow-hidden border dark:border-gray-600 mb-2">
          <button
            type="button"
            onClick={() => setFormData((p) => ({ ...p, type: 'EXPENSE' }))}
            className={`flex-1 py-2 text-sm font-medium transition ${
              !isSavings
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            💰 Expense
          </button>
          <button
            type="button"
            onClick={() => setFormData((p) => ({ ...p, type: 'SAVINGS' }))}
            className={`flex-1 py-2 text-sm font-medium transition ${
              isSavings
                ? 'bg-green-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            🏦 Savings
          </button>
        </div>

        {/* Category type hint */}
        {selectedCategory && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Category type: <span className={categoryType === 'SAVINGS' ? 'text-green-600 dark:text-green-400 font-medium' : 'text-blue-600 dark:text-blue-400 font-medium'}>
              {categoryType === 'SAVINGS' ? '🏦 Savings' : '💰 Expense'}
            </span>
            {typeOverridden && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                (overridden)
              </span>
            )}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Amount (₹) {isSavings && <span className="text-green-600 text-xs">(savings)</span>}
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleCategoryChange}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <optgroup label="💰 Expense Categories">
                {categories.filter((c) => (c.type || 'EXPENSE') === 'EXPENSE').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🏦 Savings Categories">
                {categories.filter((c) => c.type === 'SAVINGS').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Note (optional)</label>
            <input
              type="text"
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder={isSavings ? 'SIP, Emergency fund, etc.' : 'Lunch, Uber, etc.'}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-4 py-2 text-white rounded-lg transition disabled:opacity-50 ${
                isSavings ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;