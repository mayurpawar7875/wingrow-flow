import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Send, List } from 'lucide-react';
import { EmployeeRequestForm } from '@/components/employee/EmployeeRequestForm';
import { EmployeeRequestsList } from '@/components/employee/EmployeeRequestsList';

export default function Employee() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('submit');

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logout */}
      <div className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Employee Portal</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="submit" className="gap-2 py-3">
              <Send className="h-4 w-4" />
              <span>Submit Request</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 py-3">
              <List className="h-4 w-4" />
              <span>My Requests</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="space-y-4">
            <EmployeeRequestForm onSuccess={() => setActiveTab('requests')} />
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <EmployeeRequestsList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
