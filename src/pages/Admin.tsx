import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/UserManagement';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { AuditLogs } from '@/components/admin/AuditLogs';
import { ItemRequestsManagement } from '@/components/admin/ItemRequestsManagement';
import { ReimbursementsManagement } from '@/components/admin/ReimbursementsManagement';
import { NewItemRequestsManagement } from '@/components/admin/NewItemRequestsManagement';

export default function Admin() {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 space-y-6">
      {/* Top Bar - Sticky Header */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 bg-background border-b h-14 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Panel</h1>
      </div>

      <Tabs defaultValue="users" className="w-full">
        {/* Tabs Row - Sticky under header */}
        <div className="sticky top-14 z-10 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 bg-background border-b">
          <TabsList className="w-full justify-start h-auto p-0 bg-transparent overflow-x-auto flex-nowrap rounded-none border-0">
            <TabsTrigger 
              value="users" 
              className="py-3 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary whitespace-nowrap"
            >
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="requests"
              className="py-3 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary whitespace-nowrap"
            >
              Item Requests
            </TabsTrigger>
            <TabsTrigger 
              value="new-items"
              className="py-3 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary whitespace-nowrap"
            >
              New Item Requests
            </TabsTrigger>
            <TabsTrigger 
              value="reimbursements"
              className="py-3 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary whitespace-nowrap"
            >
              Reimbursements
            </TabsTrigger>
            <TabsTrigger 
              value="settings"
              className="py-3 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary whitespace-nowrap"
            >
              Settings
            </TabsTrigger>
            <TabsTrigger 
              value="audit"
              className="py-3 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary whitespace-nowrap"
            >
              Audit Logs
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content with top padding to account for sticky header */}
        <TabsContent value="users" className="mt-6 pt-2">
          <UserManagement />
        </TabsContent>

        <TabsContent value="requests" className="mt-6 pt-2">
          <ItemRequestsManagement />
        </TabsContent>

        <TabsContent value="new-items" className="mt-6 pt-2">
          <NewItemRequestsManagement />
        </TabsContent>

        <TabsContent value="reimbursements" className="mt-6 pt-2">
          <ReimbursementsManagement />
        </TabsContent>

        <TabsContent value="settings" className="mt-6 pt-2">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="audit" className="mt-6 pt-2">
          <AuditLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
