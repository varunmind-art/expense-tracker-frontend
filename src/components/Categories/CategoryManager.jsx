import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '🍎', color: '#FF6B6B' });
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const iconPickerRef = useRef(null);
  const colorPickerRef = useRef(null);

  // ─── Color Options ───────────────────────────────────────────────
  const colorOptions = [
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

  // ─── Icon Name Mapping (for search) ──────────────────────────────
  const iconNames = {
    '🍎': 'apple',
    '🍌': 'banana',
    '🍇': 'grapes',
    '🍊': 'orange',
    '🍋': 'lemon',
    '🍉': 'watermelon',
    '🍓': 'strawberry',
    '🫐': 'blueberry',
    '🥝': 'kiwi',
    '🍑': 'peach',
    '🥭': 'mango',
    '🍍': 'pineapple',
    '🥬': 'cabbage',
    '🥕': 'carrot',
    '🧅': 'onion',
    '🥦': 'broccoli',
    '🌽': 'corn',
    '🍅': 'tomato',
    '🥒': 'cucumber',
    '🫑': 'pepper',
    '🧄': 'garlic',
    '🥔': 'potato',
    '🍠': 'sweet potato',
    '🍞': 'bread',
    '🥐': 'croissant',
    '🥖': 'baguette',
    '🧇': 'waffle',
    '🥞': 'pancake',
    '🧀': 'cheese',
    '🥚': 'egg',
    '🍳': 'frying pan',
    '🥓': 'bacon',
    '🥩': 'steak',
    '🍗': 'poultry leg',
    '🍖': 'meat on bone',
    '🍔': 'hamburger',
    '🍟': 'fries',
    '🌭': 'hot dog',
    '🥪': 'sandwich',
    '🌮': 'taco',
    '🫔': 'tamale',
    '🥙': 'stuffed flatbread',
    '🧆': 'falafel',
    '🥗': 'salad',
    '🍿': 'popcorn',
    '🍕': 'pizza',
    '🍣': 'sushi',
    '🍱': 'bento box',
    '🥘': 'shallow pan',
    '🍲': 'pot of food',
    '🫕': 'fondue',
    '🥫': 'canned food',
    '🍜': 'ramen',
    '🍝': 'spaghetti',
    '🍛': 'curry',
    '🍚': 'cooked rice',
    '☕': 'coffee',
    '🍵': 'tea',
    '🧃': 'juice box',
    '🥤': 'cup with straw',
    '🧋': 'bubble tea',
    '🍶': 'sake',
    '🍺': 'beer',
    '🥂': 'toast',
    '🍷': 'wine',
    '🥃': 'whisky',
    '🛍️': 'shopping bags',
    '🛒': 'shopping cart',
    '💰': 'money bag',
    '💳': 'credit card',
    '🏷️': 'label',
    '📦': 'package',
    '🎁': 'gift',
    '🧾': 'receipt',
    '📱': 'mobile phone',
    '💻': 'laptop',
    '⌚': 'watch',
    '🎧': 'headphones',
    '📷': 'camera',
    '🎮': 'gamepad',
    '⌨️': 'keyboard',
    '🖱️': 'mouse',
    '📡': 'satellite antenna',
    '📺': 'television',
    '🏠': 'house',
    '🏡': 'house with garden',
    '🚪': 'door',
    '🪑': 'chair',
    '🛋️': 'couch',
    '🛏️': 'bed',
    '🚿': 'shower',
    '🧹': 'broom',
    '🧺': 'basket',
    '🪥': 'toothbrush',
    '🧴': 'lotion',
    '💡': 'bulb',
    '🔌': 'plug',
    '🔋': 'battery',
    '🧯': 'extinguisher',
    '🔑': 'key',
    '🧰': 'toolbox',
    '🚗': 'car',
    '🚕': 'taxi',
    '🚙': 'SUV',
    '🚌': 'bus',
    '🚎': 'trolleybus',
    '🏎️': 'race car',
    '🚓': 'police car',
    '🚑': 'ambulance',
    '🚒': 'fire truck',
    '🚐': 'minibus',
    '🚛': 'lorry',
    '🚜': 'tractor',
    '🏍️': 'motorcycle',
    '🛵': 'scooter',
    '🚲': 'bicycle',
    '✈️': 'airplane',
    '🚀': 'rocket',
    '🚁': 'helicopter',
    '⛵': 'sailboat',
    '🚢': 'ship',
    '🏥': 'hospital',
    '💊': 'pill',
    '🧪': 'test tube',
    '🩺': 'stethoscope',
    '🏋️': 'weightlifting',
    '🤸': 'cartwheel',
    '🧘': 'lotus',
    '⛹️': 'basketball',
    '🚴': 'cycling',
    '🏊': 'swimming',
    '📚': 'books',
    '📖': 'open book',
    '📝': 'memo',
    '✏️': 'pencil',
    '📓': 'notebook',
    '📔': 'notebook with cover',
    '📕': 'closed book',
    '📗': 'green book',
    '📘': 'blue book',
    '📙': 'orange book',
    '📎': 'paperclip',
    '📏': 'ruler',
    '📐': 'triangular ruler',
    '🗂️': 'card index dividers',
    '📋': 'clipboard',
    '💼': 'briefcase',
    '📊': 'bar chart',
    '📈': 'chart increasing',
    '📉': 'chart decreasing',
    '🎬': 'film camera',
    '🎭': 'performing arts',
    '🎨': 'art palette',
    '🎪': 'circus tent',
    '🎟️': 'admission ticket',
    '🎫': 'ticket',
    '🎵': 'musical note',
    '🎶': 'musical notes',
    '🎤': 'microphone',
    '🎧': 'headphones',
    '🎲': 'game die',
    '♟️': 'chess pawn',
    '🏆': 'trophy',
    '🏅': 'medal',
    '🎖️': 'military medal',
    '🧩': 'puzzle piece',
    '🌿': 'herb',
    '🌱': 'seedling',
    '🌳': 'deciduous tree',
    '🌲': 'evergreen tree',
    '🌵': 'cactus',
    '🌸': 'cherry blossom',
    '🌺': 'hibiscus',
    '🌻': 'sunflower',
    '🌹': 'rose',
    '🌷': 'tulip',
    '🌾': 'sheaf of rice',
    '🍂': 'fallen leaf',
    '🍁': 'maple leaf',
    '🍄': 'mushroom',
    '🌰': 'chestnut',
    '🐶': 'dog',
    '🐱': 'cat',
    '🐭': 'mouse',
    '🐹': 'hamster',
    '🐰': 'rabbit',
    '🦊': 'fox',
    '🐻': 'bear',
    '🐼': 'panda',
    '🐨': 'koala',
    '🐯': 'tiger',
    '🦁': 'lion',
    '🐮': 'cow',
    '🐷': 'pig',
    '🐸': 'frog',
    '🐵': 'monkey',
    '🧳': 'luggage',
    '🎒': 'backpack',
    '⛺': 'tent',
    '🏕️': 'camping',
    '🏖️': 'beach with umbrella',
    '🌋': 'volcano',
    '🏔️': 'mountain',
    '🗻': 'mount fuji',
    '🏝️': 'desert island',
  };

  // ─── Grouped Icons ────────────────────────────────────────────────
  const iconGroups = [
    {
      label: '🍎 Food & Drink',
      icons: [
        '🍎', '🍌', '🍇', '🍊', '🍋', '🍉', '🍓', '🫐', '🥝', '🍑', '🥭', '🍍',
        '🥬', '🥕', '🧅', '🥦', '🌽', '🍅', '🥒', '🫑', '🧄', '🥔', '🍠',
        '🍞', '🥐', '🥖', '🧇', '🥞', '🧀', '🥚', '🍳', '🥓', '🥩', '🍗', '🍖',
        '🍔', '🍟', '🌭', '🥪', '🌮', '🫔', '🥙', '🧆', '🥗', '🍿',
        '🍕', '🍣', '🍱', '🥘', '🍲', '🫕', '🥫', '🍜', '🍝', '🍛', '🍚',
        '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🥂', '🍷', '🥃',
      ],
    },
    {
      label: '🛍️ Shopping & Daily',
      icons: ['🛍️', '🛒', '💰', '💳', '🏷️', '📦', '🎁', '🧾'],
    },
    {
      label: '💻 Tech & Gadgets',
      icons: ['📱', '💻', '⌚', '🎧', '📷', '🎮', '⌨️', '🖱️', '📡', '📺'],
    },
    {
      label: '🏠 Home & Utilities',
      icons: [
        '🏠', '🏡', '🚪', '🪑', '🛋️', '🛏️', '🚿', '🧹', '🧺', '🪥', '🧴',
        '💡', '🔌', '🔋', '🧯', '🔑', '🧰',
      ],
    },
    {
      label: '🚗 Transport',
      icons: [
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚛', '🚜',
        '🏍️', '🛵', '🚲', '✈️', '🚀', '🚁', '⛵', '🚢',
      ],
    },
    {
      label: '🏥 Health & Fitness',
      icons: ['🏥', '💊', '🧪', '🩺', '🏋️', '🤸', '🧘', '⛹️', '🚴', '🏊'],
    },
    {
      label: '📚 Education & Work',
      icons: [
        '📚', '📖', '📝', '✏️', '📓', '📔', '📕', '📗', '📘', '📙',
        '📎', '📏', '📐', '🗂️', '📋', '💼', '📊', '📈', '📉',
      ],
    },
    {
      label: '🎬 Entertainment & Misc',
      icons: [
        '🎬', '🎭', '🎨', '🎪', '🎟️', '🎫', '🎵', '🎶', '🎤', '🎧',
        '🎲', '♟️', '🏆', '🏅', '🎖️', '🧩',
      ],
    },
    {
      label: '🌿 Nature & Outdoors',
      icons: [
        '🌿', '🌱', '🌳', '🌲', '🌵', '🌸', '🌺', '🌻', '🌹', '🌷',
        '🌾', '🍂', '🍁', '🍄', '🌰', '🐶', '🐱', '🐭', '🐹', '🐰',
        '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
      ],
    },
    {
      label: '🧳 Travel',
      icons: ['🧳', '🎒', '⛺', '🏕️', '🏖️', '🌋', '🏔️', '🗻', '🏝️'],
    },
  ];

  // ─── Click Outside ──────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target)) {
        setIconPickerOpen(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Data Fetching ──────────────────────────────────────────────
  useEffect(() => {
    fetchCategories();
  }, []);

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

  // ─── Handlers ────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      const res = await api.post('/categories', newCategory);
      setCategories([res.data, ...categories]);
      setNewCategory({ name: '', icon: '🍎', color: '#FF6B6B' });
      toast.success('Category created!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? (Expenses will remain)')) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories(categories.filter((c) => c.id !== id));
      toast.success('Deleted');
    } catch (error) {
      toast.error('Cannot delete default categories');
    }
  };

  // ─── Icon Search Filter ──────────────────────────────────────────
  const getFilteredGroups = () => {
    if (!searchTerm.trim()) return iconGroups;
    const query = searchTerm.toLowerCase().trim();
    return iconGroups
      .map((group) => ({
        ...group,
        icons: group.icons.filter((icon) => {
          const name = iconNames[icon] || icon;
          return name.toLowerCase().includes(query);
        }),
      }))
      .filter((group) => group.icons.length > 0);
  };

  const filteredGroups = getFilteredGroups();

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Categories</h1>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Add New Category</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-4 items-end">
          {/* ─── Name ──────────────────────────────────────────────── */}
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

          {/* ─── Icon Picker ────────────────────────────────────────── */}
          <div className="relative" ref={iconPickerRef}>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Icon</label>
            <button
              type="button"
              onClick={() => setIconPickerOpen(!iconPickerOpen)}
              className="w-16 h-12 flex items-center justify-center text-2xl border rounded-lg dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            >
              {newCategory.icon}
            </button>
            {iconPickerOpen && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 max-h-72 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-10 p-2">
                {/* Search Input */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 pb-2 z-10">
                  <input
                    type="text"
                    placeholder="Search icons..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                {/* Icon Grid */}
                {filteredGroups.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">No icons found</div>
                ) : (
                  filteredGroups.map((group) => (
                    <div key={group.label} className="mb-2">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-gray-800 py-1">
                        {group.label}
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {group.icons.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => {
                              setNewCategory({ ...newCategory, icon });
                              setIconPickerOpen(false);
                              setSearchTerm('');
                            }}
                            className={`text-2xl p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition ${
                              newCategory.icon === icon ? 'bg-blue-200 dark:bg-blue-800 ring-2 ring-blue-500' : ''
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ─── Color Picker ──────────────────────────────────────── */}
          <div className="relative" ref={colorPickerRef}>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Color</label>
            <button
              type="button"
              onClick={() => setColorPickerOpen(!colorPickerOpen)}
              className="w-40 h-12 flex items-center justify-between px-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
              style={{ backgroundColor: newCategory.color }}
            >
              <span
                className="text-sm font-medium"
                style={{
                  color: ['#FFEEAD', '#F1C40F', '#87CEEB', '#32CD32', '#95A5A6'].includes(newCategory.color)
                    ? '#1a1a1a'
                    : '#ffffff',
                }}
              >
                {colorOptions.find((c) => c.value === newCategory.color)?.name || 'Select'}
              </span>
              <span
                className="text-xs"
                style={{
                  color: ['#FFEEAD', '#F1C40F', '#87CEEB', '#32CD32', '#95A5A6'].includes(newCategory.color)
                    ? '#1a1a1a'
                    : '#ffffff',
                }}
              >
                ▼
              </span>
            </button>
            {colorPickerOpen && (
              <div className="absolute left-0 mt-2 w-64 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-10 p-2">
                <div className="grid grid-cols-2 gap-1">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        setNewCategory({ ...newCategory, color: color.value });
                        setColorPickerOpen(false);
                      }}
                      className={`flex items-center space-x-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                        newCategory.color === color.value ? 'ring-2 ring-blue-500' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{
                          color: ['#FFEEAD', '#F1C40F', '#87CEEB', '#32CD32', '#95A5A6'].includes(color.value)
                            ? '#1a1a1a'
                            : '#ffffff',
                        }}
                      >
                        {color.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            Add Category
          </button>
        </form>
      </div>

      {/* ─── Category List ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <span style={{ fontSize: '24px' }}>{c.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">{c.name}</p>
                {c.isDefault && <span className="text-xs text-gray-500 dark:text-gray-400">Default</span>}
              </div>
            </div>
            {!c.isDefault && (
              <button
                onClick={() => handleDelete(c.id)}
                className="text-red-600 dark:text-red-400 hover:underline text-sm"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManager;