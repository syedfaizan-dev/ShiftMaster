import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Calendar, LogOut } from "lucide-react";

export default function Navbar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUser();

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className="w-64 bg-gray-100 border-r border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900">Shift Management</h2>
        </div>
        <nav className="space-y-2 px-4">
          <Link href="/">
            <button className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700">
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
          </Link>
          <Link href="/shifts">
            <button className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700">
              <Calendar className="w-5 h-5" />
              <span>Shifts</span>
            </button>
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 p-4">
          <Button 
            variant="outline" 
            className="w-full justify-start text-gray-700"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar with dual colors */}
        <div className="h-16 flex relative">
          {/* Primary color (30%) */}
          <div className="absolute inset-0 w-[30%] bg-primary" />
          {/* Secondary color (70%) */}
          <div className="absolute inset-0 left-[30%] right-0 bg-secondary" />
          {/* Content */}
          <div className="relative flex items-center justify-end px-6 w-full">
            <span className="text-secondary-foreground font-medium">
              Welcome, {user?.fullName}
            </span>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 bg-background overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}