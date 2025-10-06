import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              User management will be displayed here
            </p>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              System settings will be displayed here
            </p>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Audit logs will be displayed here
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
