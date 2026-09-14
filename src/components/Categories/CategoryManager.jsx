import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';

// ─── Color options ─────────────────────────────────────────────
const COLOR_OPTIONS = [
  { name: 'Red', value: '#FF6B6B' },
  { name: 'Teal', value: '#4ECDC4' },
  { name: 'Blue', value: '#45B7D1' },
  { name: 'Green', value: '#96CEB4' },
  { name: 'Yellow', value: '#FFEEAD' },
  { name: 'Rose', value: '#D4A5A5' },
  { name: 'Purple', value: '#9B59B6' },
  { name: 'Orange', value: '#E67E22' },
  { name: 'Emerald', value: '#2ECC71' },
  { name: 'Gray', value: '#95A5A6' },
  { name: 'Pink', value: '#FF6B8A' },
  { name: 'Navy', value: '#2C3E50' },
  { name: 'Coral', value: '#FF7F50' },
  { name: 'Gold', value: '#F1C40F' },
  { name: 'Sky', value: '#87CEEB' },
  { name: 'Lime', value: '#32CD32' },
  { name: 'Indigo', value: '#4B0082' },
  { name: 'Crimson', value: '#DC143C' },
];

const LIGHT_COLORS = ['#FFEEAD', '#F1C40F', '#87CEEB', '#32CD32', '#95A5A6'];

// ─── Icon name map (for search) ─────────────────────────────────
const ICON_NAMES = {
  '🍎':'apple','🍌':'banana','🍇':'grapes','🍊':'orange','🍋':'lemon','🍉':'watermelon','🍓':'strawberry',
  '🫐':'blueberry','🥝':'kiwi','🍑':'peach','🥭':'mango','🍍':'pineapple','🥬':'cabbage','🥕':'carrot',
  '🧅':'onion','🥦':'broccoli','🌽':'corn','🍅':'tomato','🥒':'cucumber','🫑':'pepper','🧄':'garlic',
  '🥔':'potato','🍠':'sweet potato','🍞':'bread','🥐':'croissant','🥖':'baguette','🧇':'waffle','🥞':'pancake',
  '🧀':'cheese','🥚':'egg','🍳':'frying pan','🥓':'bacon','🥩':'steak','🍗':'poultry','🍖':'meat',
  '🍔':'hamburger','🍟':'fries','🌭':'hot dog','🥪':'sandwich','🌮':'taco','🫔':'tamale','🥙':'flatbread',
  '🧆':'falafel','🥗':'salad','🍿':'popcorn','🍕':'pizza','🍣':'sushi','🍱':'bento','🥘':'pan',
  '🍲':'pot food','🫕':'fondue','🥫':'canned','🍜':'ramen','🍝':'spaghetti','🍛':'curry','🍚':'rice',
  '☕':'coffee','🍵':'tea','🧃':'juice','🥤':'cup straw','🧋':'bubble tea','🍶':'sake','🍺':'beer',
  '🥂':'toast','🍷':'wine','🥃':'whisky','🛍️':'shopping bags','🛒':'cart','💰':'money bag','💳':'credit card',
  '🏷️':'label','📦':'package','🎁':'gift','🧾':'receipt','📱':'mobile','💻':'laptop','⌚':'watch',
  '🎧':'headphones','📷':'camera','🎮':'gamepad','⌨️':'keyboard','🖱️':'mouse','📡':'antenna','📺':'tv',
  '🏠':'house','🏡':'home','🚪':'door','🪑':'chair','🛋️':'couch','🛏️':'bed','🚿':'shower','🧹':'broom',
  '🧺':'basket','🪥':'toothbrush','🧴':'lotion','💡':'bulb','🔌':'plug','🔋':'battery','🧯':'extinguisher',
  '🔑':'key','🧰':'toolbox','🚗':'car','🚕':'taxi','🚙':'suv','🚌':'bus','🚎':'trolleybus','🏎️':'race car',
  '🚓':'police car','🚑':'ambulance','🚒':'fire truck','🚐':'minibus','🚛':'lorry','🚜':'tractor',
  '🏍️':'motorcycle','🛵':'scooter','🚲':'bicycle','✈️':'airplane','🚀':'rocket','🚁':'helicopter',
  '⛵':'sailboat','🚢':'ship','🏥':'hospital','💊':'pill','🧪':'test tube','🩺':'stethoscope',
  '🏋️':'gym','🤸':'cartwheel','🧘':'yoga','⛹️':'basketball','🚴':'cycling','🏊':'swimming','📚':'books',
  '📖':'book','📝':'memo','✏️':'pencil','📓':'notebook','📔':'journal','📕':'red book','📗':'green book',
  '📘':'blue book','📙':'orange book','📎':'paperclip','📏':'ruler','📐':'triangle ruler','🗂️':'dividers',
  '📋':'clipboard','💼':'briefcase','📊':'bar chart','📈':'chart up','📉':'chart down','🎬':'film',
  '🎭':'theatre','🎨':'palette','🎪':'circus','🎟️':'admission ticket','🎫':'ticket','🎵':'music note',
  '🎶':'music notes','🎤':'microphone','🎲':'dice','♟️':'chess','🏆':'trophy','🏅':'medal','🎖️':'military medal',
  '🧩':'puzzle','🌿':'herb','🌱':'seedling','🌳':'tree','🌲':'evergreen','🌵':'cactus','🌸':'blossom',
  '🌺':'hibiscus','🌻':'sunflower','🌹':'rose','🌷':'tulip','🌾':'rice','🍂':'fallen leaf','🍁':'maple',
  '🍄':'mushroom','🌰':'chestnut','🐶':'dog','🐱':'cat','🐭':'mouse','🐹':'hamster','🐰':'rabbit',
  '🦊':'fox','🐻':'bear','🐼':'panda','🐨':'koala','🐯':'tiger','🦁':'lion','🐮':'cow','🐷':'pig',
  '🐸':'frog','🐵':'monkey','🧳':'luggage','🎒':'backpack','⛺':'tent','🏕️':'camping','🏖️':'beach',
  '🌋':'volcano','🏔️':'mountain','🗻':'fuji','🏝️':'island',
};

// ─── Icon groups ────────────────────────────────────────────────
const ICON_GROUPS = [
  {
    label: '🍎 Food & Drink',
    icons: [
      '🍎','🍌','🍇','🍊','🍋','🍉','🍓','🫐','🥝','🍑','🥭','🍍',
      '🥬','🥕','🧅','🥦','🌽','🍅','🥒','🫑','🧄','🥔','🍠',
      '🍞','🥐','🥖','🧇','🥞','🧀','🥚','🍳','🥓','🥩','🍗','🍖',
      '🍔','🍟','🌭','🥪','🌮','🫔','🥙','🧆','🥗','🍿',
      '🍕','🍣','🍱','🥘','🍲','🫕','🥫','🍜','🍝','🍛','🍚',
      '☕','🍵','🧃','🥤','🧋','🍶','🍺','🥂','🍷','🥃',
    ],
  },
  { label: '🛍️ Shopping & Daily', icons: ['🛍️','🛒','💰','💳','🏷️','📦','🎁','🧾'] },
  { label: '💻 Tech & Gadgets', icons: ['📱','💻','⌚','🎧','📷','🎮','⌨️','🖱️','📡','📺'] },
  {
    label: '🏠 Home & Utilities',
    icons: ['🏠','🏡','🚪','🪑','🛋️','🛏️','🚿','🧹','🧺','🪥','🧴','💡','🔌','🔋','🧯','🔑','🧰'],
  },
  {
    label: '🚗 Transport',
    icons: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚛','🚜','🏍️','🛵','🚲','✈️','🚀','🚁','⛵','🚢'],
  },
  { label: '🏥 Health & Fitness', icons: ['🏥','💊','🧪','🩺','🏋️','🤸','🧘','⛹️','🚴','🏊'] },
  {
    label: '📚 Education & Work',
    icons: ['📚','📖','📝','✏️','📓','📔','📕','📗','📘','📙','📎','📏','📐','🗂️','📋','💼','📊','📈','📉'],
  },
  {
    label: '🎬 Entertainment & Misc',
    icons: ['🎬','🎭','🎨','🎪','🎟️','🎫','🎵','🎶','🎤','🎧','🎲','♟️','🏆','🏅','🎖️','🧩'],
  },
  {
    label: '🌿 Nature & Outdoors',
    icons: ['🌿','🌱','🌳','🌲','🌵','🌸','🌺','🌻','🌹','🌷','🌾','🍂','🍁','🍄','🌰','🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵'],
  },
  { label: '🧳 Travel', icons: ['🧳','🎒','⛺','🏕️','🏖️','🌋','🏔️','🗻','🏝️'] },
];

// ─── Icon Picker ────────────────────────────────────────────────
const IconPicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter logic – when search is empty, show everything
  const query = search.trim().toLowerCase();
  const filtered = query
    ? ICON_GROUPS.map((g) => ({
        ...g,
        icons: g.icons.filter((i) => {
          const name = ICON_NAMES[i] || i;
          return name.toLowerCase().includes(query);
        }),
      })).filter((g) => g.icons.length > 0)
    : ICON_GROUPS;

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Icon</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-16 h-12 flex items-center justify-center text-2xl border rounded-lg dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
      >
        {value}
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 max-h-72 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-30 p-2">
          <div className="sticky top-0 bg-white dark:bg-gray-800 pb-2 z-10">
            <input
              type="text"
              placeholder="Search icons... (try 'car', 'sip', 'savings')"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              No icons found
            </div>
          ) : (
            filtered.map((g) => (
              <div key={g.label} className="mb-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-12 bg-white dark:bg-gray-800 py-1">
                  {g.label}
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {g.icons.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => {
                        onChange(ic);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={`text-2xl p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition ${
                        value === ic ? 'bg-blue-200 dark:bg-blue-800 ring-2 ring-blue-500' : ''
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Color Picker ───────────────────────────────────────────────
const ColorPicker = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const labelColor = LIGHT_COLORS.includes(value) ? '#1a1a1a' : '#ffffff';
  const currentName = COLOR_OPTIONS.find((c) => c.value === value)?.name || 'Select';

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Color</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-40 h-12 flex items-center justify-between px-3 border rounded-lg dark:border-gray-600 hover:opacity-90 transition"
        style={{ backgroundColor: value }}
      >
        <span className="text-sm font-medium" style={{ color: labelColor }}>{currentName}</span>
        <span className="text-xs" style={{ color: labelColor }}>▼</span>
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-64 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-30 p-2">
          <div className="grid grid-cols-2 gap-1">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => { onChange(c.value); setOpen(false); }}
                className={`flex items-center p-2 rounded hover:opacity-90 transition ${value === c.value ? 'ring-2 ring-blue-500' : ''}`}
                style={{ backgroundColor: c.value }}
              >
                <span className="text-sm font-medium" style={{ color: LIGHT_COLORS.includes(c.value) ? '#1a1a1a' : '#ffffff' }}>
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Type Toggle ────────────────────────────────────────────────
const TypeToggle = ({ value, onChange }) => (
  <div>
    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Type</label>
    <div className="flex rounded-lg overflow-hidden border dark:border-gray-600 h-12">
      <button
        type="button"
        onClick={() => onChange('EXPENSE')}
        className={`px-4 text-sm font-medium transition ${
          value === 'EXPENSE'
            ? 'bg-blue-600 text-white'
            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
        }`}
      >
        💰 Expense
      </button>
      <button
        type="button"
        onClick={() => onChange('SAVINGS')}
        className={`px-4 text-sm font-medium transition ${
          value === 'SAVINGS'
            ? 'bg-green-600 text-white'
            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
        }`}
      >
        🏦 Savings
      </button>
    </div>
  </div>
);

// ─── Main Component ─────────────────────────────────────────────
const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '🍎', color: '#FF6B6B', type: 'EXPENSE' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', icon: '🍎', color: '#FF6B6B', type: 'EXPENSE' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return toast.error('Category name is required');
    try {
      const res = await api.post('/categories', newCategory);
      setCategories([res.data, ...categories]);
      setNewCategory({ name: '', icon: '🍎', color: '#FF6B6B', type: 'EXPENSE' });
      toast.success('Category created!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed');
    }
  };

  const handleOpenEdit = (cat) => {
    setEditingId(cat.id);
    setEditData({
      name: cat.name,
      icon: cat.icon || '📌',
      color: cat.color || '#95A5A6',
      type: cat.type || 'EXPENSE',
    });
  };

  const handleSaveEdit = async () => {
    if (!editData.name.trim()) return toast.error('Name cannot be empty');
    setSaving(true);
    try {
      const res = await api.put(`/categories/${editingId}`, editData);
      setCategories(categories.map((c) => (c.id === editingId ? res.data : c)));
      toast.success('Category updated');
      setEditingId(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories(categories.filter((c) => c.id !== id));
      toast.success('Deleted');
    } catch (error) {
      toast.error('Cannot delete default categories');
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Categories</h1>

      {/* Add form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Add New Category</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Name</label>
            <input
              type="text"
              placeholder="e.g., Groceries"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <TypeToggle value={newCategory.type} onChange={(type) => setNewCategory({ ...newCategory, type })} />
          <IconPicker value={newCategory.icon} onChange={(icon) => setNewCategory({ ...newCategory, icon })} />
          <ColorPicker value={newCategory.color} onChange={(color) => setNewCategory({ ...newCategory, color })} />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
            Add Category
          </button>
        </form>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((c) => {
          const isSavings = c.type === 'SAVINGS';
          return (
            <div key={c.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <span
                  className="w-10 h-10 flex items-center justify-center rounded-full shrink-0"
                  style={{ backgroundColor: c.color || '#E5E7EB', fontSize: '20px' }}
                >
                  {c.icon}
                </span>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">{c.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        isSavings
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      }`}
                    >
                      {isSavings ? '🏦 Savings' : '💰 Expense'}
                    </span>
                    {c.isDefault && <span className="text-xs text-gray-500 dark:text-gray-400">Default</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                >
                  Edit
                </button>
                {!c.isDefault && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="px-2 py-1 text-xs font-medium rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Edit Category</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
              <div className="mb-4">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  autoFocus
                  required
                />
              </div>
              <div className="mb-4">
                <TypeToggle value={editData.type} onChange={(type) => setEditData({ ...editData, type })} />
              </div>
              <div className="flex flex-wrap gap-4 mb-4">
                <IconPicker value={editData.icon} onChange={(icon) => setEditData({ ...editData, icon })} />
                <ColorPicker value={editData.color} onChange={(color) => setEditData({ ...editData, color })} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Renaming or changing the type will automatically update all linked entries.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;