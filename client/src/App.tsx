import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Shifts from "@/pages/shifts";
import Roles from "@/pages/roles";
import Employees from "@/pages/employees";
import Requests from "@/pages/requests";
import ShiftTypes from "@/pages/shift-types";
import Tasks from "@/pages/tasks";
import Users from "@/pages/users";
import TaskTypes from "@/pages/task-types";
import Managers from "@/pages/managers";
import InspectorsPage from "./pages/inspectors";
// Add Buildings import
import Buildings from "@/pages/buildings";

function Router() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/">
        {user.isAdmin ? <Dashboard /> : <Redirect to="/shifts" />}
      </Route>
      <Route path="/shifts" component={Shifts} />
      {user.isAdmin && (
        <>
          <Route path="/buildings" component={Buildings} />
          <Route path="/roles" component={Roles} />
          <Route path="/users" component={Users} />
          <Route path="/employees" component={Employees} />
          <Route path="/managers" component={Managers} />
          <Route path="/inspectors" component={InspectorsPage} />
          <Route path="/shift-types" component={ShiftTypes} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/task-types" component={TaskTypes} />
        </>
      )}
      <Route path="/requests" component={Requests} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;