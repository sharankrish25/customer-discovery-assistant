import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Lightbulb, Mail } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-950">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            Customer Discovery Assistant
          </h1>
          <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
            AI-powered interview analysis to validate your product ideas with real customer insights
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-purple-600 text-purple-400 hover:bg-purple-950">
              <Link href="/interview/new">Upload Interview</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <FileText className="w-8 h-8 text-purple-500 mb-2" />
              <CardTitle className="text-white">Auto Analysis</CardTitle>
              <CardDescription className="text-zinc-400">
                Automatic summary, insights, and alignment analysis powered by Claude AI
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <Users className="w-8 h-8 text-purple-500 mb-2" />
              <CardTitle className="text-white">Customer Profiles</CardTitle>
              <CardDescription className="text-zinc-400">
                Organize interviews by customer with stakeholder tracking
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <Lightbulb className="w-8 h-8 text-purple-500 mb-2" />
              <CardTitle className="text-white">Better Questions</CardTitle>
              <CardDescription className="text-zinc-400">
                Generate follow-up questions based on The Mom Test principles
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <Mail className="w-8 h-8 text-purple-500 mb-2" />
              <CardTitle className="text-white">Follow-up Emails</CardTitle>
              <CardDescription className="text-zinc-400">
                Draft personalized follow-up emails referencing key insights
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
