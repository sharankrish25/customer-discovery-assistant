import { AlignmentOutput } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AlignmentProps {
  alignment: AlignmentOutput | null;
}

export function Alignment({ alignment }: AlignmentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alignment Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {alignment ? (
          <div className="space-y-4">
            <div className="pb-4 border-b">
              <h4 className="mb-2 text-sm font-semibold text-green-600">Supports</h4>
              {alignment.supports.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5">
                  {alignment.supports.map((item, index) => (
                    <li key={index} className="text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>
            <div className="pb-4 border-b">
              <h4 className="mb-2 text-sm font-semibold text-red-600">Contradicts</h4>
              {alignment.contradicts.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5">
                  {alignment.contradicts.map((item, index) => (
                    <li key={index} className="text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-600">Neutral</h4>
              {alignment.neutral.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5">
                  {alignment.neutral.map((item, index) => (
                    <li key={index} className="text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No alignment analysis available yet. Analysis pending.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
