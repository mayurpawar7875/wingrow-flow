import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface Reimbursement {
  id: string;
  date: string;
  category: string;
  amount: number;
  market_or_location: string;
  status: string;
  bill_file_url: string;
  notes?: string;
}

interface ReimbursementTableProps {
  reimbursements: Reimbursement[];
  onEdit: (reimbursement: Reimbursement) => void;
  onDelete: (id: string) => void;
}

export function ReimbursementTable({ reimbursements, onEdit, onDelete }: ReimbursementTableProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      Submitted: 'secondary',
      Approved: 'default',
      Rejected: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (reimbursements.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No reimbursement requests yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Click "New Request" to submit your first expense claim
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Expense Type</TableHead>
            <TableHead>Amount (₹)</TableHead>
            <TableHead>Market/Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Receipt</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reimbursements.map((reimbursement) => (
            <TableRow key={reimbursement.id}>
              <TableCell className="font-medium">
                {format(new Date(reimbursement.date), 'dd MMM yyyy')}
              </TableCell>
              <TableCell>{reimbursement.category}</TableCell>
              <TableCell>₹{reimbursement.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell>{reimbursement.market_or_location}</TableCell>
              <TableCell>{getStatusBadge(reimbursement.status)}</TableCell>
              <TableCell>
                {reimbursement.bill_file_url ? (
                  <a
                    href={reimbursement.bill_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                    onClick={(e) => {
                      // Verify URL is valid before opening
                      if (!reimbursement.bill_file_url.startsWith('http')) {
                        e.preventDefault();
                        const { toast } = require('sonner');
                        toast.error('Receipt not found or deleted');
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View
                  </a>
                ) : (
                  <span className="text-muted-foreground text-sm">No receipt</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {reimbursement.status === 'Submitted' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(reimbursement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(reimbursement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
