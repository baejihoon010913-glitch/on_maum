import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navigation from './Navigation';
import { cn } from '@/utils/cn';

const MainLayout: React.FC = () => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleMenuToggle = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const handleMenuItemClick = () => {
    setShowMobileMenu(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Header 
        onMenuToggle={handleMenuToggle} 
        showMobileMenu={showMobileMenu}
      />

      <div className="flex flex-1 relative">
        {/* Mobile Sidebar Overlay */}
        {showMobileMenu && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside className={cn(
          "fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 md:hidden",
          showMobileMenu ? "translate-x-0" : "-translate-x-full"
        )}>
          <Navigation isMobile onItemClick={handleMenuItemClick} />
        </aside>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-64 md:bg-white md:border-r md:border-gray-200">
          <div className="flex-1 px-4 py-6">
            <Navigation isMobile onItemClick={handleMenuItemClick} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
            {/* Mobile-first responsive container */}
            <div className="max-w-4xl mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <Navigation />
    </div>
  );
};

export default MainLayout;