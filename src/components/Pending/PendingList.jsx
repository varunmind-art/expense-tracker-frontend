import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';

const PendingList = () => {
  const [pending, setPending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  // ✅ State to store selected category for each pending item (display mode)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pendingRes, catRes] = await Promise.all([
        api.get('/pending'),
        api.get('/categories'),
      ]);
      setPending(pendingRes.data);
      setCategories(catRes.data);
      // Reset selections when data loads
      setSelectedCategoryIds({});
    } catch (error) {
      toast.error('Failed to load pending imports');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id, categoryId) => {
    // Use the selected category from dropdown if available, otherwise fallback
    const finalCategoryId = selectedCategoryIds[id] || categoryId || null;
    if (!finalCategoryId) {
      toast.error('Please select a category before confirming.');
      return;
    }
    try {
      await api.post(`/pending/${id}/confirm`, { categoryId: finalCategoryId });
      toast.success('Expense created!');
      fetchData();
    } catch (error) {
      toast.error('Confirmation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Reject this pending transaction?')) return;
    try {
      await api.delete(`/pending/${id}`);
      toast.success('Rejected');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditData({
      amount: item.amount,
      merchant: item.merchant,
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
      note: item.note || '',
      categoryId: item.categoryId || '',
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      await api.put(`/pending/${id}`, editData);
      toast.success('Updated');
      setEditingId(null);
      fetchData();
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const handleCategoryChange = (itemId, categoryId) => {
    setSelectedCategoryIds(prev => ({ ...prev, [itemId]: categoryId }));
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Pending Transactions</h1>
      {pending.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No pending imports.</p>
      ) : (
        <div className="space-y-4">
          {pending.map(item => {
            const amount = parseFloat(item.amount || 0);
            // Determine which categoryId to show in dropdown
            const selectedId = editingId === item.id
              ? editData.categoryId
              : (selectedCategoryIds[item.id] || item.categoryId || '');

            return (
              <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                {editingId === item.id ? (
                  // --- Edit Mode ---
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="number"
                        value={editData.amount}
                        onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <input
                        type="text"
                        value={editData.merchant}
                        onChange={(e) => setEditData({ ...editData, merchant: e.target.value })}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <input
                        type="date"
                        value={editData.date}
                        onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Note"
                        value={editData.note}
                        onChange={(e) => setEditData({ ...editData, note: e.target.value })}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <select
                        value={editData.categoryId}
                        onChange={(e) => setEditData({ ...editData, categoryId: e.target.value })}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                      </select>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // --- Display Mode with Category Dropdown ---
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{item.merchant}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {amount.toFixed(2)} · {new Date(item.date).toLocaleDateString()}
                      </p>
                      {item.note && <p className="text-sm text-gray-500">{item.note}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* ✅ Category dropdown */}
                      <select
                        value={selectedId}
                        onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                        className="px-2 py-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                      >
                        <option value="">Category</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 dark:text-red-400 hover:underline text-sm"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleConfirm(item.id, item.categoryId)}
                        className={`bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm ${
                          !selectedId ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={!selectedId}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingList;