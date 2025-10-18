'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type {
  CoachingOutput,
  BetterQuestionsOutput,
  FollowUpEmailOutput,
} from '@/types/ai';

interface OptionalActionsProps {
  interviewId: string;
  hasCoaching: boolean;
  hasQuestions: boolean;
  hasEmail: boolean;
  onCoachingLoaded: (data: CoachingOutput) => void;
  onQuestionsLoaded: (data: BetterQuestionsOutput) => void;
  onEmailLoaded: (data: FollowUpEmailOutput) => void;
}

export function OptionalActions({
  interviewId,
  hasCoaching,
  hasQuestions,
  hasEmail,
  onCoachingLoaded,
  onQuestionsLoaded,
  onEmailLoaded,
}: OptionalActionsProps) {
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const handleAnalyzeQuality = async () => {
    setLoadingCoach(true);
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze quality');
      }

      const data = await response.json();
      onCoachingLoaded(data.coaching);
      toast.success('Coaching analysis generated!');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to analyze interview quality'
      );
      console.error(error);
    } finally {
      setLoadingCoach(false);
    }
  };

  const handleGenerateQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const response = await fetch('/api/next-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate questions');
      }

      const data = await response.json();
      onQuestionsLoaded(data.betterQuestions);
      toast.success('Better questions generated!');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate questions'
      );
      console.error(error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleGenerateEmail = async (
    desiredCommitment?: string,
    chosenInsightTitle?: string
  ) => {
    setLoadingEmail(true);
    try {
      const response = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId,
          desiredCommitment,
          chosenInsightTitle,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate email');
      }

      const data = await response.json();
      onEmailLoaded(data.followUpEmail);
      toast.success('Follow-up email generated!');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate follow-up email'
      );
      console.error(error);
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Button
        onClick={handleAnalyzeQuality}
        disabled={loadingCoach}
        variant="outline"
        className="flex-1 sm:flex-none"
      >
        {loadingCoach ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            {hasCoaching ? 'Re-analyze' : 'Analyze'} Interview Quality
          </>
        )}
      </Button>

      <Button
        onClick={handleGenerateQuestions}
        disabled={loadingQuestions}
        variant="outline"
        className="flex-1 sm:flex-none"
      >
        {loadingQuestions ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            {hasQuestions ? 'Regenerate' : 'Generate'} Better Questions
          </>
        )}
      </Button>

      <Button
        onClick={() => handleGenerateEmail()}
        disabled={loadingEmail}
        variant="outline"
        className="flex-1 sm:flex-none"
      >
        {loadingEmail ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            {hasEmail ? 'Regenerate' : 'Generate'} Follow-up Email
          </>
        )}
      </Button>
    </div>
  );
}
