import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';

const ExpenseForm = ({ isOpen, onClose, onSubmit, initialData, categories, isLoading }) => {
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    merchant: '',
    categoryId: '',
    receiptUrl: '',
    type: 'EXPENSE',
  });

  // ⭐ Managed merchant list
  const [managedMerchants, setManagedMerchants] = useState([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newMerchantName, setNewMerchantName] = useState('');

  const selectedCategory = categories.find((c) => c.id === formData.categoryId);

  // Load managed merchants when form opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api.get('/merchant-list')
      .then((res) => {
        if (!cancelled) setManagedMerchants(res.data || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        amount: initialData.amount || '',
        date: initialData.date
          ? new Date(initialData.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        note: initialData.note || '',
        merchant: initialData.merchant || '',
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
        merchant: '',
        categoryId: firstCat ? firstCat.id : '',
        receiptUrl: '',
        type: firstCat?.type || 'EXPENSE',
      });
    }
    setIsAddingNew(false);
    setNewMerchantName('');
  }, [initialData, categories, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e) => {
    const newCategoryId = e.target.value;
    const cat = categories.find((c) => c.id === newCategoryId);
    setFormData((prev) => ({
      ...prev,
      categoryId: newCategoryId,
      type: cat?.type || 'EXPENSE',
    }));
  };

  // Merchant select handler
  const handleMerchantSelect = (e) => {
    const value = e.target.value;
    if (value === '__NEW__') {
      setIsAddingNew(true);
      setNewMerchantName('');
      setFormData((prev) => ({ ...prev, merchant: '' }));
    } else {
      setIsAddingNew(false);
      setFormData((prev) => ({ ...prev, merchant: value }));
    }
  };

  const handleConfirmNewMerchant = () => {
    const name = newMerchantName.trim();
    if (!name) {
      toast.error('Enter a merchant name');
      return;
    }
    setFormData((prev) => ({ ...prev, merchant: name }));
    setIsAddingNew(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // If a new merchant is being typed but not confirmed, use it anyway
    let finalMerchant = formData.merchant;
    if (isAddingNew && newMerchantName.trim()) {
      finalMerchant = newMerchantName.trim();
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Please select a category.');
      return;
    }
    onSubmit({ ...formData, merchant: finalMerchant, amount: parseFloat(formData.amount) });
  };

  if (!isOpen) return null;

  const isSavings = formData.type === 'SAVINGS';
  const categoryType = selectedCategory?.type || 'EXPENSE';
  const typeOverridden = categoryType !== formData.type;

  // Is current merchant not in the managed list?
  const merchantNotInList =
    formData.merchant && !managedMerchants.some((m) => m.name === formData.merchant);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 my-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          {initialData ? 'Edit Entry' : isSavings ? 'Add Savings' : 'Add Expense'}
        </h2>

        {/* Type Toggle */}
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

        {selectedCategory && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Category type:{' '}
            <span className={categoryType === 'SAVINGS' ? 'text-green-600 dark:text-green-400 font-medium' : 'text-blue-600 dark:text-blue-400 font-medium'}>
              {categoryType === 'SAVINGS' ? '🏦 Savings' : '💰 Expense'}
            </span>
            {typeOverridden && <span className="ml-2 text-amber-600 dark:text-amber-400">(overridden)</span>}
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
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </optgroup>
              <optgroup label="🏦 Savings Categories">
                {categories.filter((c) => c.type === 'SAVINGS').map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* ⭐ Merchant: managed dropdown + inline add-new */}
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">
              Merchant / Shop / Website <span className="text-xs text-gray-500">(optional)</span>
            </label>

            {!isAddingNew ? (
              <div className="space-y-2">
                <select
                  value={formData.merchant}
                  onChange={handleMerchantSelect}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— No merchant —</option>
                  {managedMerchants.filter((m) => m.isActive).map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                  {/* Show legacy merchant not in list yet */}
                  {merchantNotInList && (
                    <option value={formData.merchant}>{formData.merchant} (not in list)</option>
                  )}
                  <option value="__NEW__">+ Add new merchant…</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., Amazon, Swiggy"
                  value={newMerchantName}
                  onChange={(e) => setNewMerchantName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmNewMerchant();
                    }
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleConfirmNewMerchant}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
                >
                  Use
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddingNew(false); setNewMerchantName(''); }}
                  className="px-3 py-2 border rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            )}

            {managedMerchants.length > 0 && !isAddingNew && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {managedMerchants.filter((m) => m.isActive).length} saved merchant{managedMerchants.length === 1 ? '' : 's'} ·{' '}
                <a href="/merchants" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Manage
                </a>
              </p>
            )}
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