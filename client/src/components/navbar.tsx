import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { user, logout } = useUser();

  return (
    <nav className="relative h-16">
      {/* Primary color background (30%) */}
      <div className="absolute inset-0 bg-primary w-[30%] h-full" />
      {/* Secondary color background (70%) */}
      <div className="absolute inset-0 left-[30%] bg-secondary w-[70%] h-full" />
      
      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <span className="text-primary-foreground font-bold cursor-pointer">
              Shift Management
            </span>
          </Link>
          <Link href="/shifts">
            <span className="text-secondary-foreground cursor-pointer hover:text-secondary-foreground/80">
              Shifts
            </span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-secondary-foreground">
            Welcome, {user?.fullName}
          </span>
          <Button variant="outline" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
