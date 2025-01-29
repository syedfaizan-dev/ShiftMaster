import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import ShiftCalendar from "@/components/shift-calendar";
import Navbar from "@/components/navbar";

export default function Dashboard() {
  const { user } = useUser();

  return (
    <Navbar>
      <div className="p-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{user?.isAdmin ? 'Shift Overview' : 'My Shifts'}</CardTitle>
            </CardHeader>
            <CardContent>
              <ShiftCalendar userId={!user?.isAdmin ? user?.id : undefined} />
            </CardContent>
          </Card>
        </div>
      </div>
    </Navbar>
  );
}