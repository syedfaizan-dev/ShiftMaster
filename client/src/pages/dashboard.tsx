import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import UserTable from "@/components/user-table";
import ShiftCalendar from "@/components/shift-calendar";

export default function Dashboard() {
  const { user, logout } = useUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Welcome, {user?.fullName}</h1>
          <div className="space-x-4">
            <Link href="/shifts">
              <Button variant="outline">View Shifts</Button>
            </Link>
            <Button variant="destructive" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {user?.isAdmin ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <UserTable />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Shift Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ShiftCalendar />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>My Shifts</CardTitle>
              </CardHeader>
              <CardContent>
                <ShiftCalendar userId={user?.id} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
