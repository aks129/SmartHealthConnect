import React from 'react';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  MessageSquare, 
  FileSpreadsheet, 
  AlertTriangle, 
  CreditCard, 
  Database,
  MapPin,
  User,
  Building,
  Beaker,
  BarChart,
  Activity,
  LineChart,
  BookOpen,
  Microscope,
  Plus,
  Link,
  PanelLeft,
  Settings
} from 'lucide-react';

interface TabGroupProps {
  label: string;
  className?: string;
  children: React.ReactNode;
}

export function TabGroup({ label, className, children }: TabGroupProps) {
  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      <div className="text-xs font-medium text-gray-500 px-1">{label}</div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

interface TabItemProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: (id: string) => void;
  color?: string;
}

export function TabItem({ id, icon, label, active, onClick, color = "bg-gray-100" }: TabItemProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
        active 
          ? `${color} text-gray-900 shadow-sm` 
          : "text-gray-700 hover:bg-gray-100",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
      )}
    >
      <span className={cn(
        "w-4 h-4",
        active ? "text-primary" : "text-gray-500"
      )}>
        {icon}
      </span>
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex flex-col space-y-4 md:space-y-6 mb-6 overflow-x-auto pb-2">
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-6">
        <TabGroup label="PREVENTIVE HEALTH">
          <TabItem 
            id="care-gaps" 
            icon={<AlertTriangle />} 
            label="Care Gaps & HEDIS" 
            active={activeTab === "care-gaps"} 
            onClick={onTabChange}
            color="bg-red-50" 
          />
          <TabItem 
            id="activity-feed" 
            icon={<Activity />} 
            label="Health Alerts" 
            active={activeTab === "activity-feed"} 
            onClick={onTabChange}
            color="bg-amber-50" 
          />
          <TabItem 
            id="advanced-analytics" 
            icon={<Microscope />} 
            label="Preventive Analytics" 
            active={activeTab === "advanced-analytics"} 
            onClick={onTabChange}
            color="bg-orange-50" 
          />
        </TabGroup>
        
        <TabGroup label="HEALTH DATA">
          <TabItem 
            id="health" 
            icon={<FileText />} 
            label="Health Dashboard" 
            active={activeTab === "health"} 
            onClick={onTabChange}
            color="bg-blue-50" 
          />
          <TabItem 
            id="ips" 
            icon={<FileSpreadsheet />} 
            label="Patient Summary" 
            active={activeTab === "ips"} 
            onClick={onTabChange}
            color="bg-blue-50" 
          />
          <TabItem 
            id="visualizations" 
            icon={<BarChart />} 
            label="Health Visualizations" 
            active={activeTab === "visualizations"} 
            onClick={onTabChange}
            color="bg-indigo-50" 
          />
          <TabItem 
            id="trends" 
            icon={<LineChart />} 
            label="Health Trends" 
            active={activeTab === "trends"} 
            onClick={onTabChange}
            color="bg-purple-50" 
          />
        </TabGroup>
        
        <TabGroup label="CONNECTIONS">
          <TabItem 
            id="connect-records" 
            icon={<Link />} 
            label="Connect Records" 
            active={activeTab === "connect-records"} 
            onClick={onTabChange}
            color="bg-emerald-50" 
          />
          <TabItem 
            id="providers" 
            icon={<User />} 
            label="My Providers" 
            active={activeTab === "providers"} 
            onClick={onTabChange}
            color="bg-green-50" 
          />
          <TabItem 
            id="provider-directory" 
            icon={<MapPin />} 
            label="Provider Directory" 
            active={activeTab === "provider-directory"} 
            onClick={onTabChange}
            color="bg-green-50" 
          />
          <TabItem 
            id="insurance" 
            icon={<CreditCard />} 
            label="Insurance" 
            active={activeTab === "insurance"} 
            onClick={onTabChange}
            color="bg-blue-50" 
          />
        </TabGroup>

        <TabGroup label="RESOURCES">
          <TabItem 
            id="medical-literature" 
            icon={<BookOpen />} 
            label="Medical Literature" 
            active={activeTab === "medical-literature"} 
            onClick={onTabChange}
            color="bg-teal-50" 
          />
          <TabItem 
            id="organizations" 
            icon={<Building />} 
            label="Organizations" 
            active={activeTab === "organizations"} 
            onClick={onTabChange}
            color="bg-green-50" 
          />
          <TabItem 
            id="research" 
            icon={<Beaker />} 
            label="Research" 
            active={activeTab === "research"} 
            onClick={onTabChange}
            color="bg-purple-50" 
          />
          <TabItem 
            id="chat" 
            icon={<MessageSquare />} 
            label="AI Health Assistant" 
            active={activeTab === "chat"} 
            onClick={onTabChange}
            color="bg-amber-50" 
          />
          <TabItem 
            id="fhir-explorer" 
            icon={<Database />} 
            label="FHIR Explorer" 
            active={activeTab === "fhir-explorer"} 
            onClick={onTabChange}
            color="bg-gray-100" 
          />
          <TabItem 
            id="settings" 
            icon={<Settings />} 
            label="Settings" 
            active={activeTab === "settings"} 
            onClick={onTabChange}
            color="bg-slate-100" 
          />
        </TabGroup>
      </div>
    </div>
  );
}