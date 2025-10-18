import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Lightbulb, Mail } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-800 to-neutral-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            Reflect
          </h1>
          <p className="text-xl text-neutral-300 mb-8 max-w-2xl mx-auto">
            Generate fast, human-readable recaps from your customer interviews and keep every conversation organised in one place.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-purple-600 text-purple-400 hover:bg-purple-950">
              <Link href="/interview/new">Add Interview</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="bg-neutral-800/50 border-neutral-700">
            <CardHeader>
              <FileText className="w-8 h-8 text-purple-400 mb-2" />
              <CardTitle className="text-neutral-50">Quick Analysis</CardTitle>
              <CardDescription className="text-neutral-300">
                Turn raw transcripts into concise takeaways that highlight what you heard.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-neutral-800/50 border-neutral-700">
            <CardHeader>
              <Users className="w-8 h-8 text-purple-400 mb-2" />
              <CardTitle className="text-neutral-50">Customer Profiles</CardTitle>
              <CardDescription className="text-neutral-300">
                Track every stakeholder, their interviews, and the ideas you tested together.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-neutral-800/50 border-neutral-700">
            <CardHeader>
              <Lightbulb className="w-8 h-8 text-purple-400 mb-2" />
              <CardTitle className="text-neutral-50">Context at a Glance</CardTitle>
              <CardDescription className="text-neutral-300">
                Skim recent conversations and refresh your memory before the next call.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-neutral-800/50 border-neutral-700">
            <CardHeader>
              <Mail className="w-8 h-8 text-purple-400 mb-2" />
              <CardTitle className="text-neutral-50">Stay in Touch</CardTitle>
              <CardDescription className="text-neutral-300">
                Keep transcripts and highlights handy so follow-up messages practically write themselves.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
