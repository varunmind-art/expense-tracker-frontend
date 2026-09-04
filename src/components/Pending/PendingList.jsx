import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';

const PendingList = () => {
  const [pending, setPending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

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
    } catch (error) {
      toast.error('Failed to load pending imports');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id, categoryId) => {
    try {
      await api.post(`/pending/${id}/confirm`, { categoryId });
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

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Pending Transactions</h1>
      {pending.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No pending imports.</p>
      ) : (
        <div className="space-y-4">
          {pending.map(item => {
            // ✅ Parse amount safely
            const amount = parseFloat(item.amount || 0);
            return (
              <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                {editingId === item.id ? (
                  // Edit mode
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
                  // Display mode
                  <div className="flex flex-wrap items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{item.merchant}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {amount.toFixed(2)} · {new Date(item.date).toLocaleDateString()}
                      </p>
                      {item.note && <p className="text-sm text-gray-500">{item.note}</p>}
                      {item.category && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{item.category.name}</span>}
                    </div>
                    <div className="flex space-x-2 mt-2 md:mt-0">
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
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
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