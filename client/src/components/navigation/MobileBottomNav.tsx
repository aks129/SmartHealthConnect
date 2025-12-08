import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  Home,
  LayoutDashboard,
  Activity,
  MessageSquare,
  Menu,
  X,
  AlertTriangle,
  Pill,
  Heart,
  BarChart,
  User,
  Settings,
  CalendarPlus,
  LogOut,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppointmentScheduler } from '@/components/scheduling/AppointmentScheduler';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  action?: () => void;
  badge?: number;
}

interface MobileBottomNavProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  careGapsCount?: number;
}

export function MobileBottomNav({ activeTab, onTabChange, careGapsCount = 0 }: MobileBottomNavProps) {
  const [location, setLocation] = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isMobile = useIsMobile();

  // Don't render on desktop
  if (!isMobile) return null;

  const primaryNavItems: NavItem[] = [
    {
      id: 'health',
      label: 'Home',
      icon: Home,
    },
    {
      id: 'care-gaps',
      label: 'Care',
      icon: AlertTriangle,
      badge: careGapsCount > 0 ? careGapsCount : undefined,
    },
    {
      id: 'visualizations',
      label: 'Trends',
      icon: BarChart,
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquare,
    },
  ];

  const moreNavItems: NavItem[] = [
    {
      id: 'vital-signs',
      label: 'Vital Signs',
      icon: Heart,
    },
    {
      id: 'medications',
      label: 'Medications',
      icon: Pill,
    },
    {
      id: 'lab-results',
      label: 'Lab Results',
      icon: Activity,
    },
    {
      id: 'allergies',
      label: 'Allergies',
      icon: AlertTriangle,
    },
  ];

  const handleNavClick = (item: NavItem) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      setLocation(item.path);
    } else {
      onTabChange?.(item.id);
    }
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      >
        {/* Gradient overlay for smooth transition */}
        <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />

        {/* Main navigation bar */}
        <div className="bg-background/95 backdrop-blur-lg border-t border-border shadow-lg">
          <div className="flex items-center justify-around px-2 py-1 safe-area-pb">
            {primaryNavItems.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={activeTab === item.id}
                onClick={() => handleNavClick(item)}
              />
            ))}

            {/* More button */}
            <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    'flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all min-w-[60px]',
                    'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div className="relative">
                    <Menu className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] mt-1 font-medium">More</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-left">More Options</SheetTitle>
                </SheetHeader>

                {/* Quick Actions */}
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <AppointmentScheduler
                      trigger={
                        <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                          <CalendarPlus className="h-5 w-5 text-primary" />
                          <span className="text-sm">Schedule Visit</span>
                        </Button>
                      }
                    />
                    <Button
                      variant="outline"
                      className="w-full h-auto py-4 flex flex-col gap-2"
                      onClick={() => {
                        onTabChange?.('medications');
                        setIsMoreOpen(false);
                      }}
                    >
                      <Pill className="h-5 w-5 text-blue-500" />
                      <span className="text-sm">Refill Rx</span>
                    </Button>
                  </div>
                </div>

                {/* Health Records */}
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Health Records
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {moreNavItems.map((item) => (
                      <Button
                        key={item.id}
                        variant={activeTab === item.id ? 'secondary' : 'ghost'}
                        className="w-full justify-start h-12"
                        onClick={() => handleNavClick(item)}
                      >
                        <item.icon className="h-4 w-4 mr-3" />
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Account */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Account
                  </h3>
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12"
                      onClick={() => {
                        setLocation('/about');
                        setIsMoreOpen(false);
                      }}
                    >
                      <User className="h-4 w-4 mr-3" />
                      About
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 text-destructive hover:text-destructive"
                      onClick={() => {
                        setLocation('/');
                        setIsMoreOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.nav>

      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-20 md:hidden" />
    </>
  );
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}

function NavButton({ item, isActive, onClick }: NavButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className={cn(
        'flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all min-w-[60px] relative',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
      onClick={onClick}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-primary/10 rounded-xl"
          initial={false}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}

      <div className="relative z-10">
        <item.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5px]')} />
        {item.badge && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
          >
            {item.badge > 9 ? '9+' : item.badge}
          </Badge>
        )}
      </div>
      <span className={cn(
        'text-[10px] mt-1 font-medium z-10',
        isActive && 'font-semibold'
      )}>
        {item.label}
      </span>
    </motion.button>
  );
}

// Floating Action Button for quick scheduling (alternative UI option)
export function FloatingScheduleButton() {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <AppointmentScheduler
      trigger={
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center md:hidden"
        >
          <CalendarPlus className="h-6 w-6" />
        </motion.button>
      }
    />
  );
}
