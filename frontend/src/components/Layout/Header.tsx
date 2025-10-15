import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, User, Menu, X } from 'lucide-react';
import { useAuth } from '@/store/authStore';
import { Button } from '@/components/UI';
import { ROUTES } from '@/utils/constants';

interface HeaderProps {
  onMenuToggle?: () => void;
  showMobileMenu?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, showMobileMenu = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              {showMobileMenu ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            {/* Logo */}
            <Link 
              to={ROUTES.HOME}
              className="flex items-center space-x-2 text-xl font-bold text-primary-600"
            >
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">O</span>
              </div>
              <span className="hidden xs:block">OnMaum</span>
            </Link>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {user ? (
              <>
                {/* Notifications */}
                <Link
                  to={ROUTES.NOTIFICATIONS}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors relative"
                >
                  <Bell className="h-5 w-5" />
                  {/* Notification badge placeholder */}
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center hidden">
                    3
                  </span>
                </Link>

                {/* User menu */}
                <div className="flex items-center space-x-2">
                  <Link
                    to={ROUTES.PROFILE}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <User className="h-5 w-5" />
                  </Link>
                  
                  <span className="hidden sm:block text-sm text-gray-700">
                    {user.nickname}
                  </span>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="hidden sm:inline-flex text-xs"
                  >
                    로그아웃
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(ROUTES.LOGIN)}
                >
                  로그인
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;