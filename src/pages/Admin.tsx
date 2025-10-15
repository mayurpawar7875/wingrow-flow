import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/UserManagement';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { AuditLogs } from '@/components/admin/AuditLogs';
import { ItemRequestsManagement } from '@/components/admin/ItemRequestsManagement';
import { ReimbursementsManagement } from '@/components/admin/ReimbursementsManagement';

export default function Admin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage users, settings, and view audit logs
        </p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="requests">Item Requests</TabsTrigger>
          <TabsTrigger value="reimbursements">Reimbursements</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <ItemRequestsManagement />
        </TabsContent>

        <TabsContent value="reimbursements" className="mt-6">
          <ReimbursementsManagement />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
