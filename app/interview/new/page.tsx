'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';

export default function NewInterviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCustomer = useStore((state) => state.addCustomer);
  const addInterview = useStore((state) => state.addInterview);
  const updateInterview = useStore((state) => state.updateInterview);
  const getCustomerByName = useStore((state) => state.getCustomerByName);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    stakeholderType: '',
    demographics: '',
    productIdea: '',
    transcript: '',
    interviewDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedTranscript = formData.transcript.trim();
    const trimmedProductIdea = formData.productIdea.trim();

    if (!trimmedTranscript || !trimmedProductIdea) {
      setError('A transcript and product idea are required.');
      return;
    }

    setLoading(true);

    try {
      const existingCustomer = getCustomerByName(formData.name);
      let customerId: string;

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        customerId = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        addCustomer({
          id: customerId,
          name: formData.name,
          email: formData.email,
          stakeholderType: formData.stakeholderType,
          demographics: formData.demographics,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const interviewId = `int-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      addInterview(customerId, {
        id: interviewId,
        uploadedAt: new Date(formData.interviewDate),
        transcript: trimmedTranscript,
        productIdea: trimmedProductIdea,
        analysis: null,
      });

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId,
          transcript: trimmedTranscript,
          productIdea: trimmedProductIdea,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        const message = result?.error?.message || 'Failed to analyze interview.';
        throw new Error(message);
      }

      updateInterview(interviewId, {
        analysis: result.data.analysis,
      });

      router.push(`/interview/${interviewId}`);
    } catch (submitError) {
      const message = submitError instanceof Error
        ? submitError.message
        : 'Failed to create interview.';
      setError(message);
      console.error(submitError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Interview</h1>
          <p className="text-muted-foreground">
            Record a new customer discovery interview
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interview Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Information</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  placeholder="e.g., Sarah Chen"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData({ ...formData, email: event.target.value })
                  }
                  placeholder="e.g., sarah@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stakeholderType">Stakeholder Type *</Label>
                <Input
                  id="stakeholderType"
                  required
                  value={formData.stakeholderType}
                  onChange={(event) =>
                    setFormData({ ...formData, stakeholderType: event.target.value })
                  }
                  placeholder="e.g., Product Manager, CEO, Engineer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="demographics">Demographics</Label>
                <Textarea
                  id="demographics"
                  value={formData.demographics}
                  onChange={(event) =>
                    setFormData({ ...formData, demographics: event.target.value })
                  }
                  placeholder="e.g., Tech company PM, 5+ years experience, B2B SaaS background"
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Interview Content</h3>

              <div className="space-y-2">
                <Label htmlFor="productIdea">Product Idea *</Label>
                <Input
                  id="productIdea"
                  required
                  value={formData.productIdea}
                  onChange={(event) =>
                    setFormData({ ...formData, productIdea: event.target.value })
                  }
                  placeholder="Summarize the opportunity you discussed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transcript">Transcript *</Label>
                <Textarea
                  id="transcript"
                  required
                  value={formData.transcript}
                  onChange={(event) =>
                    setFormData({ ...formData, transcript: event.target.value })
                  }
                  placeholder="Paste the full transcript here"
                  rows={12}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interviewDate">Interview Date *</Label>
                <Input
                  id="interviewDate"
                  type="date"
                  required
                  value={formData.interviewDate}
                  onChange={(event) =>
                    setFormData({ ...formData, interviewDate: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Analyzing…' : 'Save & Analyze'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
