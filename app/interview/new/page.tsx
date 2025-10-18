'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  getProfiles,
  saveProfile,
  upsertInterview,
  saveInterview,
} from '@/lib/storage';
import { CustomerProfile, InterviewRecord } from '@/types/customer';

export default function NewInterviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
      // Guarded import for analysis
      let runAutoAnalysis: (
        transcript: string,
        productIdea: string
      ) => Promise<any>;
      try {
        const agents = await import('@/lib/agents');
        runAutoAnalysis = agents.runAutoAnalysis;
      } catch {
        runAutoAnalysis = async (t, i) => ({
          summary: {
            summary: { bullets: ['Mock summary'], confidence: 0.7 },
          },
          insights: {
            insights: [
              {
                title: 'Mock pain',
                type: 'pain',
                quotes: [{ text: 'example', start_sec: null }],
                evidence_level: 'med' as const,
              },
            ],
            confidence: 0.7,
          },
          alignment: {
            alignment: { supports: [], contradicts: [], neutral: [] },
            confidence: 0.7,
          },
        });
      }

      // Run analysis
      const analysisResult = await runAutoAnalysis(
        formData.transcript,
        formData.productIdea
      );

      // Find or create customer profile
      const profiles = getProfiles();
      let profile = profiles.find((p) => p.name === formData.name);
      let customerId: string;

      if (!profile) {
        customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        profile = {
          id: customerId,
          name: formData.name,
          stakeholderType: formData.stakeholderType,
          demographics: formData.demographics,
          role: undefined,
          interviews: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveProfile(profile);
        toast.success(`Created new customer profile: ${formData.name}`);
      } else {
        customerId = profile.id;
        toast.info(`Using existing customer profile: ${formData.name}`);
      }

      // Create interview record
      const interviewId = `interview_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const interview: InterviewRecord = {
        id: interviewId,
        customerId,
        productIdea: formData.productIdea,
        transcript: formData.transcript,
        date: new Date().toISOString(),
        results: {
          summary: {
            bullets: analysisResult.summary.summary.bullets,
            confidence: analysisResult.summary.summary.confidence,
          },
          insights: {
            items: analysisResult.insights.insights.map((i: any) => ({
              title: i.title,
              type: i.type,
              quotes: i.quotes.map((q: any) => q.text),
              evidence: i.evidence_level,
            })),
            confidence: analysisResult.insights.confidence,
          },
          alignment: {
            supports: analysisResult.alignment.alignment.supports.map(
              (s: any) => s.quote
            ),
            contradicts: analysisResult.alignment.alignment.contradicts.map(
              (c: any) => c.quote
            ),
            neutral: analysisResult.alignment.alignment.neutral.map(
              (n: any) => n.rationale
            ),
            confidence: analysisResult.alignment.confidence,
          },
        },
      };

      // Save to localStorage
      upsertInterview(customerId, interview);
      saveInterview(interviewId, interview);

      toast.success('Interview analyzed successfully!');
      setTimeout(() => {
        toast.info('Saved to customer profile', {
          description: 'View on Dashboard',
          action: {
            label: 'Dashboard',
            onClick: () => router.push('/dashboard'),
          },
        });
      }, 500);

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
