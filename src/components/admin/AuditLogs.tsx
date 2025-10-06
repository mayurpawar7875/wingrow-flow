import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuditLogs() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <CardDescription>
          View system activity and user actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Audit logs will be displayed here
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
