// Sidebar.tsx
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Megaphone, 
  ChevronLeft, 
  ChevronRight,
  User,
  Video,
  LogOut,
  BanknoteArrowDown,
  ListChecks} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
  activeTab: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, setActiveTab, activeTab }) => {
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ads', label: 'Ads Management', icon: Video },
    { id: 'tasks', label: 'Tasks Management', icon: ListChecks },
    { id: 'withdrawal', label: 'Withdrawal Requests', icon: BanknoteArrowDown },
    { id: 'notifier', label: 'Notifier', icon: Megaphone },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'logout', label: 'Logout', icon: LogOut },
  ];

  return (
    <>
      {/* Mobile Menu Icon */}
      {!isDesktop && !isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-gray-800 text-white shadow-lg"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Overlay for mobile */}
      {isOpen && !isDesktop && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-gradient-to-b from-gray-900 to-gray-800
          text-white
          transition-all duration-300 ease-in-out
          shadow-2xl
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          {isOpen && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Admin Panel
              </span>
            </div>
          )}

          {/* Sidebar toggle button for desktop or open sidebar */}
          {(isOpen || isDesktop) && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 group"
            >
              {isOpen ? (
                <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-white" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  w-full flex items-center rounded-xl p-3 transition-all duration-200 group
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 shadow-lg shadow-blue-500/10' 
                    : 'hover:bg-gray-700/50 border border-transparent'
                  }
                `}
              >
                <div className={`
                  p-2 rounded-lg transition-colors duration-200
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                    : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600 group-hover:text-white'
                  }
                `}>
                  <Icon className="w-4 h-4" />
                </div>

                {isOpen && (
                  <span className={`
                    ml-3 font-medium transition-all duration-200
                    ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}
                  `}>
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
