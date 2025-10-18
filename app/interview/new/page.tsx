'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';

export default function NewInterviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
    interviewDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find or create customer profile
      const customer = getCustomerByName(formData.name);
      let customerId: string;

      if (!customer) {
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
        toast.success(`Created new customer profile: ${formData.name}`);
      } else {
        customerId = customer.id;
        toast.info(`Using existing customer profile: ${formData.name}`);
      }

      // Create interview record
      const interviewId = `int-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      addInterview(customerId, {
        id: interviewId,
        uploadedAt: new Date(formData.interviewDate),
        transcript: formData.transcript,
        productIdea: formData.productIdea,
        summary: null,
        insights: null,
        alignment: null,
        coaching: null,
        betterQuestions: null,
        followUpEmail: null,
        analysisStatus: 'pending',
      });

      // Call API to analyze interview
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId,
          transcript: formData.transcript,
          productIdea: formData.productIdea,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        const errorMsg = result.error?.code === '429'
          ? 'AI service is busy — please try again in a moment'
          : result.error?.message || 'Failed to analyze interview';
        throw new Error(errorMsg);
      }

      // Update the interview with the analysis results from the API
      updateInterview(interviewId, {
        summary: result.data.summary,
        insights: result.data.insights,
        alignment: result.data.alignment,
        analysisStatus: 'complete',
      });

      toast.success('Interview analyzed successfully!');
      router.push(`/interview/${interviewId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create and analyze interview';
      toast.error(message);
      console.error(error);
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
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Information</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
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
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
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
                  onChange={(e) =>
                    setFormData({ ...formData, stakeholderType: e.target.value })
                  }
                  placeholder="e.g., Product Manager, CEO, Engineer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="demographics">Demographics</Label>
                <Textarea
                  id="demographics"
                  value={formData.demographics}
                  onChange={(e) =>
                    setFormData({ ...formData, demographics: e.target.value })
                  }
                  placeholder="e.g., Tech company PM, 5+ years experience, B2B SaaS background"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interviewDate">Interview Date *</Label>
                <Input
                  id="interviewDate"
                  type="date"
                  required
                  value={formData.interviewDate}
                  onChange={(e) =>
                    setFormData({ ...formData, interviewDate: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Interview Content */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Interview Content</h3>

              <div className="space-y-2">
                <Label htmlFor="productIdea">Product Idea / Vision Being Tested *</Label>
                <Textarea
                  id="productIdea"
                  required
                  value={formData.productIdea}
                  onChange={(e) =>
                    setFormData({ ...formData, productIdea: e.target.value })
                  }
                  placeholder="e.g., AI-powered customer interview analysis tool"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transcript">Transcript *</Label>
                <Textarea
                  id="transcript"
                  required
                  value={formData.transcript}
                  onChange={(e) =>
                    setFormData({ ...formData, transcript: e.target.value })
                  }
                  placeholder="Paste the interview transcript here..."
                  rows={10}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                {loading ? 'Analyzing...' : 'Create & Analyze Interview'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
