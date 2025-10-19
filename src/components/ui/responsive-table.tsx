import { ReactNode } from 'react';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
  mobileLabel?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => ReactNode;
  emptyMessage?: string;
  isLoading?: boolean;
  mobileCardTitle?: (item: T) => ReactNode;
  mobileCardSubtitle?: (item: T) => ReactNode;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  actions,
  emptyMessage = 'No data found',
  isLoading = false,
  mobileCardTitle,
  mobileCardSubtitle,
}: ResponsiveTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="mobile-card space-y-2">
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {data.map((item) => (
          <Card
            key={keyExtractor(item)}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-4 space-y-3">
              {/* Title & Subtitle */}
              {(mobileCardTitle || mobileCardSubtitle) && (
                <div className="space-y-1">
                  {mobileCardTitle && (
                    <div className="font-medium text-base">
                      {mobileCardTitle(item)}
                    </div>
                  )}
                  {mobileCardSubtitle && (
                    <div className="text-sm text-muted-foreground">
                      {mobileCardSubtitle(item)}
                    </div>
                  )}
                </div>
              )}
              
              {/* Fields */}
              <div className="space-y-2">
                {columns.map((col) => {
                  const value = col.render ? col.render(item) : item[col.key];
                  if (!value) return null;
                  
                  return (
                    <div key={col.key} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">
                        {col.mobileLabel || col.label}:
                      </span>
                      <span className="font-medium text-right">{value}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Actions */}
              {actions && (
                <div className="pt-2 border-t flex gap-2 flex-wrap">
                  {actions(item)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col.key} className={col.className}>
                        {col.label}
                      </TableHead>
                    ))}
                    {actions && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow
                      key={keyExtractor(item)}
                      className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={() => onRowClick?.(item)}
                    >
                      {columns.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render ? col.render(item) : item[col.key]}
                        </TableCell>
                      ))}
                      {actions && (
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                            {actions(item)}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
