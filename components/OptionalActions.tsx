'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OptionalActionsProps {
  interviewId: string;
}

export function OptionalActions({ interviewId }: OptionalActionsProps) {
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

      // API route already updates the store
      await response.json();
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

      // API route already updates the store
      await response.json();
      toast.success('Next questions generated!');
    } catch (error) {
      toast.error('Failed to generate next questions');
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

      // API route already updates the store
      await response.json();
      toast.success('Follow-up email generated!');
    } catch (error) {
      toast.error('Failed to generate follow-up email');
      console.error(error);
    } finally {
      setLoadingFollowup(false);
    }
  };

  return (
    <div className="flex gap-4">
      <Button onClick={handleCoach} disabled={loadingCoach} variant="outline">
        {loadingCoach ? 'Analyzing...' : 'Analyze Interview Quality'}
      </Button>
      <Button onClick={handleNextQuestions} disabled={loadingQuestions} variant="outline">
        {loadingQuestions ? 'Generating...' : 'Generate Better Questions'}
      </Button>
      <Button onClick={handleFollowup} disabled={loadingFollowup} variant="outline">
        {loadingFollowup ? 'Generating...' : 'Generate Follow-up Email'}
      </Button>
    </div>
  );
}
