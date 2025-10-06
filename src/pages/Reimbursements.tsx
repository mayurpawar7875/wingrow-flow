import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Reimbursements() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reimbursements</h1>
          <p className="text-muted-foreground">
            Submit and track reimbursement requests
          </p>
        </div>
        <Button onClick={() => navigate('/reimbursements/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Reimbursement
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Reimbursements list will be displayed here
        </p>
      </div>
    </div>
  );
}
