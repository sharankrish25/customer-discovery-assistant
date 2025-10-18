'use client';

import Link from 'next/link';
import { Customer, Interview } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CustomerTableProps {
  customers: Customer[];
  interviews: Interview[];
}

export function CustomerTable({ customers, interviews }: CustomerTableProps) {
  const getLastInterviewDate = (customerId: string): Date | null => {
    const customerInterviews = interviews.filter((i) => i.customerId === customerId);
    if (customerInterviews.length === 0) return null;
    return customerInterviews.reduce((latest, current) =>
      current.uploadedAt > latest ? current.uploadedAt : latest,
      customerInterviews[0].uploadedAt
    );
  };

  if (customers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No customers yet. Click &quot;Seed Demo Data&quot; to load sample data or create a new interview.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Stakeholder Type</TableHead>
            <TableHead>Last Interview</TableHead>
            <TableHead className="text-right">Interviews</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const lastInterview = getLastInterviewDate(customer.id);
            const interviewCount = interviews.filter(
              (i) => i.customerId === customer.id
            ).length;

            return (
              <TableRow key={customer.id}>
                <TableCell>
                  <Link
                    href={`/profile/${customer.id}`}
                    className="font-medium hover:underline"
                  >
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{customer.stakeholderType}</Badge>
                </TableCell>
                <TableCell>
                  {lastInterview
                    ? new Date(lastInterview).toLocaleDateString()
                    : 'No interviews'}
                </TableCell>
                <TableCell className="text-right">{interviewCount}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
