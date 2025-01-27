import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ShiftForm from "@/components/shift-form";
import ShiftCalendar from "@/components/shift-calendar";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function Shifts() {
  const { user } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Shifts</h1>
          <div className="space-x-4">
            <Link href="/">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
            {user?.isAdmin && (
              <Button onClick={() => setIsDialogOpen(true)}>
                Create New Shift
              </Button>
            )}
          </div>
        </div>

        <ShiftCalendar userId={user?.isAdmin ? undefined : user?.id} />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <ShiftForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
