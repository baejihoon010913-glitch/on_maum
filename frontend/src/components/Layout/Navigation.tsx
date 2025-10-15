import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageCircle, 
  BookOpen, 
  Heart, 
  PenTool, 
  Users 
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/utils/constants';

const navigationItems = [
  {
    path: ROUTES.HOME,
    label: '홈',
    icon: Home,
  },
  {
    path: ROUTES.EMPATHY_NOTES,
    label: '공감노트',
    icon: Heart,
  },
  {
    path: ROUTES.COMMA_NOTES,
    label: '쉼표노트',
    icon: PenTool,
  },
  {
    path: ROUTES.CHAT,
    label: '상담',
    icon: MessageCircle,
  },
  {
    path: ROUTES.DIARY,
    label: '다이어리',
    icon: BookOpen,
  },
  {
    path: ROUTES.COUNSELORS,
    label: '상담사',
    icon: Users,
  },
];

interface NavigationProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ isMobile = false, onItemClick }) => {
  const location = useLocation();

  const navItemClass = isMobile
    ? "flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition-colors"
    : "flex flex-col items-center justify-center py-2 px-3 text-xs text-gray-600 hover:text-primary-500 transition-colors min-h-[3.5rem]";

  const activeClass = isMobile
    ? "bg-primary-50 text-primary-600 border-r-2 border-primary-600"
    : "text-primary-500";

  if (isMobile) {
    return (
      <nav className="py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                navItemClass,
                isActive && activeClass
              )}
              onClick={onItemClick}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="mobile-nav safe-area-bottom">
      <div className="flex">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                navItemClass,
                "flex-1",
                isActive && activeClass
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;