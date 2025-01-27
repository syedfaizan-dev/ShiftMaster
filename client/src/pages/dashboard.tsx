import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import UserTable from "@/components/user-table";
import ShiftCalendar from "@/components/shift-calendar";
import Navbar from "@/components/navbar";

export default function Dashboard() {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-6">
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