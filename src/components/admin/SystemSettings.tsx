import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SystemSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>
          Configure organization settings and approval rules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            System settings configuration will be available here
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
