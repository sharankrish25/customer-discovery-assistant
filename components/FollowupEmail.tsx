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
import { Copy, Check, Mail, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { FollowUpEmailOutput } from '@/types/ai';

interface FollowupEmailProps {
  data: FollowUpEmailOutput | null;
  onRegenerate?: (desiredCommitment: string) => void;
}

const COMMITMENT_OPTIONS = [
  '15m call',
  'prototype trial 1 week',
  'intro to teammate',
  'share anonymized data',
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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Follow-up Email Yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Generate a concise follow-up email that references interview insights
            and proposes a clear next step.
          </p>
        </CardContent>
      </Card>
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
    }
  };

  const handleRegenerate = (commitment: string) => {
    if (onRegenerate) {
      onRegenerate(commitment);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Follow-up Email</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
            {onRegenerate && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Regenerate
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {COMMITMENT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onClick={() => handleRegenerate(option)}
                    >
                      {option}
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
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject line"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder="Email body"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {body.split(/\s+/).filter(Boolean).length} words
            {body.split(/\s+/).filter(Boolean).length > 120 && (
              <span className="text-amber-600 dark:text-amber-400 ml-2">
                (Target: ≤120 words)
              </span>
            )}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <p className="text-muted-foreground">
            <strong>Tip:</strong> Keep it concise and bias-free. Reference one specific
            quote and propose exactly one clear next step.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
