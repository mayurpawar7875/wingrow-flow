import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Send, List, ClipboardCheck, PackagePlus } from 'lucide-react';
import { EmployeeRequestForm } from '@/components/employee/EmployeeRequestForm';
import { EmployeeRequestsList } from '@/components/employee/EmployeeRequestsList';
import { AssetsInspectionForm } from '@/components/employee/AssetsInspectionForm';
import { NewItemRequestForm } from '@/components/employee/NewItemRequestForm';
import { NewItemRequestsList } from '@/components/employee/NewItemRequestsList';

export default function Employee() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('submit');

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-first Header */}
      <div className="page-header">
        <div className="min-w-0 flex-1">
          <h1 className="truncate">Employee Portal</h1>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className="shrink-0"
        >
          <LogOut className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Logout</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 py-4 md:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="section-gap">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
            <TabsTrigger value="submit" className="gap-2 py-3 min-h-[44px]">
              <Send className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Request</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 py-3 min-h-[44px]">
              <List className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Status</span>
            </TabsTrigger>
            <TabsTrigger value="new-item" className="gap-2 py-3 min-h-[44px]">
              <PackagePlus className="h-4 w-4" />
              <span className="text-xs sm:text-sm">New Item</span>
            </TabsTrigger>
            <TabsTrigger value="inspection" className="gap-2 py-3 min-h-[44px]">
              <ClipboardCheck className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Assets</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="mt-0 section-gap">
            <EmployeeRequestForm onSuccess={() => setActiveTab('requests')} />
          </TabsContent>

          <TabsContent value="requests" className="mt-0 section-gap">
            <EmployeeRequestsList />
          </TabsContent>

          <TabsContent value="new-item" className="mt-0 section-gap">
            <NewItemRequestForm onSuccess={() => setActiveTab('new-item')} />
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-4 px-1">My New Item Requests</h2>
              <NewItemRequestsList />
            </div>
          </TabsContent>

          <TabsContent value="inspection" className="mt-0 section-gap">
            <AssetsInspectionForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
