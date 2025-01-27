import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import ShiftForm from "@/components/shift-form";
import ShiftCalendar from "@/components/shift-calendar";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Navbar from "@/components/navbar";

export default function Shifts() {
  const { user } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Navbar>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Shifts</h1>
          {user?.isAdmin && (
            <Button onClick={() => setIsDialogOpen(true)}>
              Create New Shift
            </Button>
          )}
        </div>

        <ShiftCalendar userId={user?.isAdmin ? undefined : user?.id} />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <ShiftForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </Navbar>
  );
}