import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-semibold">
            Customer Discovery Assistant
          </Link>
          <div className="flex gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            <Link
              href="/interview/new"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              New Interview
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
