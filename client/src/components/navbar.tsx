import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Calendar, LogOut } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useUser();

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <div className="w-64 bg-primary text-primary-foreground border-r border-primary/10">
        <div className="p-6">
          <h2 className="text-xl font-bold">Shift Management</h2>
        </div>
        <nav className="space-y-2 px-4">
          <Link href="/">
            <a className="flex items-center space-x-2 p-2 rounded-lg hover:bg-primary/10 text-primary-foreground">
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </a>
          </Link>
          <Link href="/shifts">
            <a className="flex items-center space-x-2 p-2 rounded-lg hover:bg-primary/10 text-primary-foreground">
              <Calendar className="w-5 h-5" />
              <span>Shifts</span>
            </a>
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 p-4">
          <Button 
            variant="secondary" 
            className="w-full justify-start"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Top Navbar */}
        <div className="h-16 flex items-center px-6 bg-secondary text-secondary-foreground">
          <span className="font-medium">
            Welcome, {user?.fullName}
          </span>
        </div>
      </div>
    </div>
  );
}