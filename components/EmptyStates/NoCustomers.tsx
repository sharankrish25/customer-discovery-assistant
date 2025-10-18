'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

export function NoCustomers() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No customers yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
          Upload your first customer interview to get started with discovery insights.
        </p>
        <Button asChild>
          <Link href="/interview/new">Upload Interview</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
