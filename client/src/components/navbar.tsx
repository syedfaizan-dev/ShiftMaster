import { Link, useLocation } from "wouter";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Navbar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [location] = useLocation();

  const isLinkActive = (path: string) => {
    return location === path;
  };

  const renderNavLink = (path: string, icon: React.ReactNode, label: string) => (
    <Link href={path}>
      <button
        className={cn(
          "flex w-full items-center space-x-2 p-2 rounded-lg hover:bg-gray-200 text-gray-700",
          {
            "bg-gray-200": isLinkActive(path),
            "justify-center": isMinimized,
          }
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        {icon}
        {!isMinimized && <span>{label}</span>}
      </button>
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed Top Navbar */}
      <div className="h-16 flex fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 w-fit bg-primary lg:block hidden" />
        <div
          className="absolute inset-0 lg:left-fit left-0 right-0"
          style={{ backgroundColor: "#04a3e0" }}
        />
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
          className={cn(
            "fixed left-0 top-16 bottom-0 border-r border-gray-200 overflow-y-auto overflow-x-hidden transition-all duration-200 ease-in-out z-40 bg-gray-100",
            {
              "w-64": !isMinimized,
              "w-16z": isMinimized,
              "translate-x-0": isMobileMenuOpen || !isMinimized,
              "-translate-x-full": !isMobileMenuOpen && isMinimized,
              "lg:translate-x-0": true,
            }
          )}
        >
          {/* Minimize Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 hidden lg:flex"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>

          <nav className="p-4 space-y-2 mt-10">
            {user?.isAdmin && (
              <>
                {renderNavLink("/", <LayoutDashboard className="w-5 h-5" />, "Dashboard")}
                {renderNavLink("/buildings", <Building2 className="w-5 h-5" />, "Buildings")}
                {renderNavLink("/users", <Group className="w-5 h-5" />, "Users")}
                {renderNavLink("/managers", <Users className="w-5 h-5" />, "Managers")}
                {renderNavLink("/inspectors", <UserCheck className="w-5 h-5" />, "Inspectors")}
                {renderNavLink("/tasks", <CheckSquare className="w-5 h-5" />, "Tasks")}
                {renderNavLink("/task-types", <List className="w-5 h-5" />, "Task Types")}
              </>
            )}
            {renderNavLink("/shifts", <Calendar className="w-5 h-5" />, "Shifts")}
            {renderNavLink("/requests", <FileText className="w-5 h-5" />, "Requests")}
            {user?.isAdmin && (
              <>
                {renderNavLink("/roles", <Users className="w-5 h-5" />, "Roles")}
                {renderNavLink("/shift-types", <Clock className="w-5 h-5" />, "Shift Types")}
              </>
            )}
          </nav>

          <div className={cn(
            "absolute bottom-0 p-4 bg-gray-100",
            {
              "w-64": !isMinimized,
              "w-16": isMinimized,
            }
          )}>
            <Button
              variant="outline"
              className={cn(
                "text-gray-700",
                {
                  "w-full justify-start": !isMinimized,
                  "w-full justify-center": isMinimized,
                }
              )}
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
              }}
            >
              <LogOut className="w-4 h-4" />
              {!isMinimized && <span className="ml-2">Logout</span>}
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area - Adjust margin based on screen size and sidebar state */}
        <main className={cn(
          "flex-1 bg-background overflow-y-auto min-h-screen transition-all duration-200",
          {
            "lg:ml-64": !isMinimized,
            "lg:ml-16": isMinimized,
          }
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}