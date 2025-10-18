'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';
import type { CoachingOutput, BetterQuestionsOutput, FollowUpEmailOutput, AlignmentOutput, InsightsOutput } from '@/types/ai';

interface OptionalActionsProps {
  interviewId: string;
  transcript: string;
  alignment: AlignmentOutput | null;
  insights: InsightsOutput | null;
  coaching: CoachingOutput | null;
  betterQuestions: BetterQuestionsOutput | null;
  followUpEmail: FollowUpEmailOutput | null;
  customerName: string;
  productIdea: string;
  hasCoaching: boolean;
  hasQuestions: boolean;
  hasEmail: boolean;
  onCoachingLoaded: (data: CoachingOutput) => void;
  onQuestionsLoaded: (data: BetterQuestionsOutput) => void;
  onEmailLoaded: (data: FollowUpEmailOutput) => void;
  onActionSelected: (action: 'coaching' | 'questions' | 'followup') => void;
}

export function OptionalActions({
  interviewId,
  transcript,
  alignment,
  insights,
  coaching,
  betterQuestions,
  followUpEmail,
  customerName,
  productIdea,
  hasCoaching,
  hasQuestions,
  hasEmail,
  onCoachingLoaded,
  onQuestionsLoaded,
  onEmailLoaded,
  onActionSelected,
}: OptionalActionsProps) {
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingFollowup, setLoadingFollowup] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'coaching' | 'questions' | 'followup' | null>(null);

  const setBusy = useStore((state) => state.setBusy);
  const isBusy = useStore((state) => state.isBusy);

  // Prevent concurrent requests
  const anyBusy = loadingCoach || loadingQuestions || loadingFollowup;

  const handleCoach = async () => {
    const busyKey = `${interviewId}-coach`;

    // If already has coaching data, just show it
    if (hasCoaching && coaching) {
      setSelectedAction('coaching');
      onActionSelected('coaching');
      return;
    }

    // Prevent duplicate concurrent calls
    if (isBusy(busyKey)) {
      toast.error('Already analyzing quality — please wait');
      return;
    }

    setLoadingCoach(true);
    setBusy(busyKey, true);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId, transcript }),
      });

      const result = await response.json();

      if (!result.ok) {
        // Handle {ok: false} envelope
        const errorMsg = result.error?.code === '429'
          ? 'AI service is busy — please try again in a moment'
          : result.error?.message || 'Failed to generate coaching';
        throw new Error(errorMsg);
      }

      onCoachingLoaded(result.data.coaching);
      setSelectedAction('coaching');
      onActionSelected('coaching');
      toast.success('Coaching generated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate coaching analysis';
      toast.error(message);
      console.error(error);
    } finally {
      setLoadingCoach(false);
      setBusy(busyKey, false);
    }
  };

  const handleNextQuestions = async () => {
    const busyKey = `${interviewId}-questions`;

    // If already has questions data, just show it
    if (hasQuestions && betterQuestions) {
      setSelectedAction('questions');
      onActionSelected('questions');
      return;
    }

    if (isBusy(busyKey)) {
      toast.error('Already generating questions — please wait');
      return;
    }

    setLoadingQuestions(true);
    setBusy(busyKey, true);

    try {
      const response = await fetch('/api/next-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId, transcript, productIdea, alignment, coaching }),
      });

      const result = await response.json();

      if (!result.ok) {
        const errorMsg = result.error?.code === '429'
          ? 'AI service is busy — please try again in a moment'
          : result.error?.message || 'Failed to generate questions';
        throw new Error(errorMsg);
      }

      onQuestionsLoaded(result.data.betterQuestions);
      setSelectedAction('questions');
      onActionSelected('questions');
      toast.success('Questions ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate better questions';
      toast.error(message);
      console.error(error);
    } finally {
      setLoadingQuestions(false);
      setBusy(busyKey, false);
    }
  };

  const handleFollowup = async () => {
    const busyKey = `${interviewId}-followup`;

    // If already has email data, just show it
    if (hasEmail && followUpEmail) {
      setSelectedAction('followup');
      onActionSelected('followup');
      return;
    }

    if (isBusy(busyKey)) {
      toast.error('Already drafting email — please wait');
      return;
    }

    setLoadingFollowup(true);
    setBusy(busyKey, true);

    try {
      const response = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId, insights, customerName }),
      });

      const result = await response.json();

      if (!result.ok) {
        const errorMsg = result.error?.code === '429'
          ? 'AI service is busy — please try again in a moment'
          : result.error?.message || 'Failed to generate email';
        throw new Error(errorMsg);
      }

      onEmailLoaded(result.data.followUpEmail);
      setSelectedAction('followup');
      onActionSelected('followup');
      toast.success('Follow-up email drafted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate follow-up email';
      toast.error(message);
      console.error(error);
    } finally {
      setLoadingFollowup(false);
      setBusy(busyKey, false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button
          onClick={handleCoach}
          disabled={anyBusy}
          variant={selectedAction === 'coaching' ? "default" : "outline"}
          className="h-24 flex flex-col items-center justify-center gap-2 transition hover:shadow-md"
          aria-label="Coaching"
          aria-busy={loadingCoach}
        >
          {loadingCoach ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Analyzing...</span>
            </>
          ) : (
            <>
              <span className="text-lg font-semibold">Coaching</span>
              <span className="text-xs text-muted-foreground">{hasCoaching ? 'View' : 'Generate'}</span>
            </>
          )}
        </Button>
        <Button
          onClick={handleNextQuestions}
          disabled={anyBusy}
          variant={selectedAction === 'questions' ? "default" : "outline"}
          className="h-24 flex flex-col items-center justify-center gap-2 transition hover:shadow-md"
          aria-label="Questions"
          aria-busy={loadingQuestions}
        >
          {loadingQuestions ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Generating...</span>
            </>
          ) : (
            <>
              <span className="text-lg font-semibold">Questions</span>
              <span className="text-xs text-muted-foreground">{hasQuestions ? 'View' : 'Generate'}</span>
            </>
          )}
        </Button>
        <Button
          onClick={handleFollowup}
          disabled={anyBusy}
          variant={selectedAction === 'followup' ? "default" : "outline"}
          className="h-24 flex flex-col items-center justify-center gap-2 transition hover:shadow-md"
          aria-label="Follow-up Email"
          aria-busy={loadingFollowup}
        >
          {loadingFollowup ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Drafting...</span>
            </>
          ) : (
            <>
              <span className="text-lg font-semibold">Follow-up</span>
              <span className="text-xs text-muted-foreground">{hasEmail ? 'View' : 'Generate'}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
