import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Calendar, LogOut, Users, User } from "lucide-react";

export default function Navbar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUser();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar with dual colors - Full Width */}
      <div className="h-16 flex relative">
        {/* Primary color (30%) */}
        <div className="absolute inset-0 w-64 bg-primary" />
        {/* Secondary color (70%) */}
        <div className="absolute inset-0 left-64 right-0" style={{ backgroundColor: '#04a3e0' }} />
        {/* Content */}
        <div className="relative flex items-center justify-between px-6 w-full">
          <h2 className="text-xl font-bold text-primary-foreground">
            Shift Management
          </h2>
          <span className="text-white font-medium">
            Welcome, {user?.fullName}
          </span>
        </div>
      </div>

      {/* Main Content Area with Left Navigation */}
      <div className="flex flex-1">
        {/* Left Navigation */}
        <div className="w-64 bg-gray-100 min-h-screen border-r border-gray-200">
          <nav className="p-4 space-y-2">
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
            {user?.isAdmin && (
              <>
                <Link href="/employees">
                  <button className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700">
                    <User className="w-5 h-5" />
                    <span>Employees</span>
                  </button>
                </Link>
                <Link href="/roles">
                  <button className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700">
                    <Users className="w-5 h-5" />
                    <span>Roles</span>
                  </button>
                </Link>
              </>
            )}
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

        {/* Page Content */}
        <main className="flex-1 bg-background overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}