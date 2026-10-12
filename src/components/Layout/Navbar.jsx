import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../Common/ThemeToggle';
import { Menu } from '@headlessui/react';
import { UserCircleIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Expenses', path: '/expenses' },
    { name: 'Income', path: '/income' },
    { name: 'Recurring', path: '/recurring' },
    { name: 'Loans', path: '/loans' },
    { name: 'Merchants', path: '/merchants' },
    { name: 'Budgets', path: '/budgets' },
    { name: 'Categories', path: '/categories' },
    { name: 'Pending', path: '/pending' },
    { name: 'Settings', path: '/settings' },
  ];

  // "/loans/123" must highlight the Loans entry too.
  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
            💰 Expense Tracker
          </Link>
          <div className="hidden lg:flex items-center space-x-5">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition ${
                  isActive(link.path)
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 transition">
                <UserCircleIcon className="h-8 w-8" />
                <span className="hidden sm:inline">{user?.name || 'User'}</span>
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={`${
                        active ? 'bg-gray-100 dark:bg-gray-700' : ''
                      } block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                    >
                      Logout
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Menu>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="lg:hidden text-gray-700 dark:text-gray-300 hover:text-blue-600 transition"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <XMarkIcon className="h-7 w-7" /> : <Bars3Icon className="h-7 w-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation: without this the links are simply unreachable on a
          small screen, because the desktop row is hidden below the lg breakpoint. */}
      {mobileOpen && (
        <div className="lg:hidden border-t dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4 py-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-2 py-3 rounded-lg transition ${
                  isActive(link.path)
                    ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-gray-700'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
