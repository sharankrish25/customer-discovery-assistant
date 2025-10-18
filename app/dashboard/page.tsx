'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomerCard } from '@/components/CustomerCard';
import { NoCustomers } from '@/components/EmptyStates/NoCustomers';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';

export default function DashboardPage() {
  const customers = useStore((state) => state.customers);
  const seedMock = useStore((state) => state.seedMock);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const handleSeedDemo = () => {
    seedMock();
    toast.success('Demo data loaded!');
  };

  const filtered = useMemo(() => {
    let result = customers;

    // Filter by stakeholder type
    if (filter !== 'All') {
      result = result.filter((p) => p.stakeholderType === filter);
    }

    // Search by name or demographics
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(query);
        const demoMatch = p.demographics?.toLowerCase().includes(query);
        const typeMatch = p.stakeholderType?.toLowerCase().includes(query);
        return nameMatch || demoMatch || typeMatch;
      });
    }

    return result;
  }, [customers, search, filter]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/">← Home</Link>
            </Button>
            <h1 className="text-3xl font-bold">Dashboard</h1>
          </div>
          <div className="flex gap-2">
            {customers.length === 0 && (
              <Button onClick={handleSeedDemo} variant="outline">
                Load Demo Data
              </Button>
            )}
            <Button asChild>
              <Link href="/interview/new">New Interview</Link>
            </Button>
          </div>
        </div>

        {customers.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by name, role, or product idea..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Patient">Patient</SelectItem>
                <SelectItem value="Nurse">Nurse</SelectItem>
                <SelectItem value="Doctor">Doctor</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Results Count */}
      {customers.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filtered.length} of {customers.length} customers
        </p>
      )}

      {/* Cards Grid */}
      {customers.length === 0 ? (
        <NoCustomers />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No customers match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((profile) => (
            <CustomerCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
