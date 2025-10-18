'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { AnalyzeResponse } from '@/lib/types';

export default function NewInterviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const getCustomerByName = useStore((state) => state.getCustomerByName);
  const addCustomer = useStore((state) => state.addCustomer);
  const addInterview = useStore((state) => state.addInterview);
  const updateInterviewAnalysis = useStore((state) => state.updateInterviewAnalysis);

  const [formData, setFormData] = useState({
    name: '',
    stakeholderType: '',
    demographics: '',
    productIdea: '',
    transcript: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find or create customer
      const customer = getCustomerByName(formData.name);
      let customerId: string;

      if (!customer) {
        const newCustomerId = `cust_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        customerId = addCustomer({
          id: newCustomerId,
          name: formData.name,
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

      // Create interview
      const newInterviewId = `interview_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const interviewId = addInterview(customerId, {
        id: newInterviewId,
        uploadedAt: new Date(),
        productIdea: formData.productIdea,
        transcript: formData.transcript,
        summary: null,
        insights: null,
        alignment: null,
        coaching: null,
        betterQuestions: null,
        followUpEmail: null,
        analysisStatus: 'pending',
      });

      // Analyze interview
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze interview');
      }

      // API route already updates the store, just check for success
      await response.json();

      toast.success('Interview analyzed successfully!');
      router.push(`/interview/${interviewId}`);
    } catch (error) {
      toast.error('Failed to create and analyze interview');
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Interview</h1>
        <p className="text-muted-foreground">
          Record a new customer discovery interview
        </p>
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
              <Button type="submit" disabled={loading}>
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
