'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, RefreshCw, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { FollowUpEmailOutput } from '@/types/ai';

interface FollowupEmailProps {
  data: FollowUpEmailOutput | null;
  onRegenerate?: (desiredCommitment: string) => void;
}

const commitmentOptions = [
  { value: '15m call', label: '15-minute call' },
  { value: 'prototype trial 1 week', label: 'Prototype trial (1 week)' },
  { value: 'intro to teammate', label: 'Introduction to teammate' },
  { value: 'share anonymized data', label: 'Share anonymized data' },
];

export function FollowupEmail({ data, onRegenerate }: FollowupEmailProps) {
  const [subject, setSubject] = useState(data?.subject || '');
  const [body, setBody] = useState(data?.body || '');
  const [copied, setCopied] = useState(false);

  // Update local state when data changes
  if (data && (subject !== data.subject || body !== data.body)) {
    setSubject(data.subject);
    setBody(data.body);
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <div className="text-4xl">✉️</div>
          <h3 className="text-lg font-semibold">No Follow-up Email Yet</h3>
          <p className="text-sm text-muted-foreground">
            Click "Generate Follow-up Email" above to create a personalized follow-up email based
            on the interview insights and customer quotes.
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    const fullEmail = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullEmail);
      setCopied(true);
      toast.success('Email copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy email');
      console.error(error);
    }
  };

  const handleRegenerate = (commitment: string) => {
    if (onRegenerate) {
      onRegenerate(commitment);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Follow-up Email</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>

              {onRegenerate && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Choose desired commitment:
                    </div>
                    {commitmentOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => handleRegenerate(option.value)}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-body">Body</Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body"
              rows={16}
              className="font-mono text-sm"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Tip: Edit the subject and body as needed. The email references specific quotes from
            the interview to make it more personal and contextual.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
