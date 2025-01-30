import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Calendar, LogOut, Users, FileText, Clock, CheckSquare, List, Group } from "lucide-react";
import { NotificationBell } from "./notification-bell";

export default function Navbar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUser();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed Top Navbar */}
      <div className="h-16 flex fixed top-0 left-0 right-0 z-50">
        {/* Primary color (for sidebar width) */}
        <div className="absolute inset-0 w-64 bg-primary" />
        {/* Secondary color (remaining width) */}
        <div className="absolute inset-0 left-64 right-0" style={{ backgroundColor: '#04a3e0' }} />
        {/* Content */}
        <div className="relative flex items-center justify-between px-6 w-full">
          <h2 className="text-xl font-bold text-primary-foreground">
            Shift Management
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-white font-medium">
              Welcome, {user?.fullName}
            </span>
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Main Content Area with Fixed Left Navigation */}
      <div className="flex pt-16 flex-1">
        {/* Fixed Left Navigation */}
        <div className="w-64 bg-gray-100 fixed left-0 top-16 bottom-0 border-r border-gray-200 overflow-y-auto">
          <nav className="p-4 space-y-2">
            {user?.isAdmin && (
              <>
                <Link href="/">
                  <button className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700">
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Dashboard</span>
                  </button>
                </Link>
                <Link href="/users">
                  <button className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700">
                    <Group className="w-5 h-5" />
                    <span>Users</span>
                  </button>
                </Link>
                <Link href="/tasks">
                  <button className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700">
                    <CheckSquare className="w-5 h-5" />
                    <span>Tasks</span>
                  </button>
                </Link>
                <Link href="/task-types">
                  <button className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700">
                    <List className="w-5 h-5" />
                    <span>Task Types</span>
                  </button>
                </Link>
              </>
            )}
            <Link href="/shifts">
              <button className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700">
                <Calendar className="w-5 h-5" />
                <span>Shifts</span>
              </button>
            </Link>
            <Link href="/requests">
              <button className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700">
                <FileText className="w-5 h-5" />
                <span>Requests</span>
              </button>
            </Link>
            {user?.isAdmin && (
              <>
                <Link href="/roles">
                  <button className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700">
                    <Users className="w-5 h-5" />
                    <span>Roles</span>
                  </button>
                </Link>
                <Link href="/shift-types">
                  <button className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700">
                    <Clock className="w-5 h-5" />
                    <span>Shift Types</span>
                  </button>
                </Link>
              </>
            )}
          </nav>
          <div className="absolute bottom-0 w-64 p-4 bg-gray-100">
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

        {/* Scrollable Content Area */}
        <main className="flex-1 ml-64 bg-background overflow-y-auto min-h-screen">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}