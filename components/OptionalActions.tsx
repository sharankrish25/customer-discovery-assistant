'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CoachingOutput, BetterQuestionsOutput, FollowUpEmailOutput } from '@/types/ai';

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
  const [loadingFollowup, setLoadingFollowup] = useState(false);

  const handleCoach = async () => {
    setLoadingCoach(true);
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });

      if (!response.ok) throw new Error('Failed to generate coaching');

      const result = await response.json();
      onCoachingLoaded(result.coaching);
      toast.success('Coaching analysis generated!');
    } catch (error) {
      toast.error('Failed to generate coaching analysis');
      console.error(error);
    } finally {
      setLoadingCoach(false);
    }
  };

  const handleNextQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const response = await fetch('/api/next-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });

      if (!response.ok) throw new Error('Failed to generate questions');

      const result = await response.json();
      onQuestionsLoaded(result.betterQuestions);
      toast.success('Better questions generated!');
    } catch (error) {
      toast.error('Failed to generate better questions');
      console.error(error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleFollowup = async () => {
    setLoadingFollowup(true);
    try {
      const response = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });

      if (!response.ok) throw new Error('Failed to generate follow-up');

      const result = await response.json();
      onEmailLoaded(result.followUpEmail);
      toast.success('Follow-up email generated!');
    } catch (error) {
      toast.error('Failed to generate follow-up email');
      console.error(error);
    } finally {
      setLoadingFollowup(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button
        onClick={handleCoach}
        disabled={loadingCoach}
        variant="outline"
        className="flex-1"
      >
        {loadingCoach && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {hasCoaching ? 'Re-analyze' : 'Analyze'} Interview Quality
      </Button>
      <Button
        onClick={handleNextQuestions}
        disabled={loadingQuestions}
        variant="outline"
        className="flex-1"
      >
        {loadingQuestions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {hasQuestions ? 'Regenerate' : 'Generate'} Better Questions
      </Button>
      <Button
        onClick={handleFollowup}
        disabled={loadingFollowup}
        variant="outline"
        className="flex-1"
      >
        {loadingFollowup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {hasEmail ? 'Regenerate' : 'Generate'} Follow-up Email
      </Button>
    </div>
  );
}
