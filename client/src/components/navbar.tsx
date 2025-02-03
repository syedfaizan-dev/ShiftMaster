import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  LogOut,
  Users,
  FileText,
  Clock,
  CheckSquare,
  List,
  Group,
  Menu,
  UserCheck,
  Building2,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { useState } from "react";

export default function Navbar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed Top Navbar */}
      <div className="h-16 flex fixed top-0 left-0 right-0 z-50">
        {/* Primary color (for sidebar width) */}
        <div className="absolute inset-0 w-fit bg-primary lg:block hidden" />
        {/* Secondary color (remaining width) */}
        <div
          className="absolute inset-0 lg:left-fit left-0 right-0"
          style={{ backgroundColor: "#04a3e0" }}
        />
        {/* Content */}
        <div className="relative flex items-center justify-between px-6 w-full">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-primary/20"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h2 className="text-xl font-bold text-primary-foreground">
              Shift Management
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white font-medium">
              Welcome, {user?.fullName}
            </span>
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area with Fixed Left Navigation */}
      <div className="flex pt-16 flex-1">
        {/* Fixed Left Navigation - Transform based on mobile menu state */}
        <div
          className={`
          w-fit min-w-[16rem] bg-gray-100 fixed left-0 top-16 bottom-0 border-r border-gray-200 
          overflow-y-auto overflow-x-hidden transition-transform duration-200 ease-in-out z-40
          lg:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        >
          <nav className="p-4 space-y-2">
            {user?.isAdmin && (
              <>
                <Link href="/">
                  <button
                    className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Dashboard</span>
                  </button>
                </Link>
                <Link href="/buildings">
                  <button
                    className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Building2 className="w-5 h-5" />
                    <span>Buildings</span>
                  </button>
                </Link>
                <Link href="/users">
                  <button
                    className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Group className="w-5 h-5" />
                    <span>Users</span>
                  </button>
                </Link>
                <Link href="/managers">
                  <button
                    className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Users className="w-5 h-5" />
                    <span>Managers</span>
                  </button>
                </Link>
                <Link href="/inspectors">
                  <button
                    className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <UserCheck className="w-5 h-5" />
                    <span>Inspectors</span>
                  </button>
                </Link>
                <Link href="/tasks">
                  <button
                    className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <CheckSquare className="w-5 h-5" />
                    <span>Tasks</span>
                  </button>
                </Link>
                <Link href="/task-types">
                  <button
                    className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <List className="w-5 h-5" />
                    <span>Task Types</span>
                  </button>
                </Link>
              </>
            )}
            <Link href="/shifts">
              <button
                className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Calendar className="w-5 h-5" />
                <span>Shifts</span>
              </button>
            </Link>
            <Link href="/requests">
              <button
                className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FileText className="w-5 h-5" />
                <span>Requests</span>
              </button>
            </Link>
            {user?.isAdmin && (
              <>
                <Link href="/roles">
                  <button
                    className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Users className="w-5 h-5" />
                    <span>Roles</span>
                  </button>
                </Link>
                <Link href="/shift-types">
                  <button
                    className="flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
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
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area - Adjust margin based on screen size */}
        <main className="flex-1 lg:ml-64 bg-background overflow-y-auto min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}