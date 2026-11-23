import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type SampleStory = {
  tickers: string[];
  headline: string;
  sources: number;
};

// Fictional companies and headlines, for illustration only.
const SAMPLE_STORIES: SampleStory[] = [
  {
    tickers: ["DEMO-A"],
    headline: "Alderbrook Industries files its quarterly report",
    sources: 6,
  },
  {
    tickers: ["DEMO-B", "DEMO-C"],
    headline:
      "Brightwater Robotics and Cobalt Harbor Air announce a supply agreement",
    sources: 4,
  },
  {
    tickers: ["DEMO-D"],
    headline: "Driftmoor Bank names a new chief financial officer",
    sources: 5,
  },
  {
    tickers: ["DEMO-E"],
    headline: "Eastfell Energy sets the date for its annual meeting",
    sources: 3,
  },
];

export function SampleFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your watchlist feed</CardTitle>
        <CardDescription>
          Fictional companies, for illustration.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">Sample</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {SAMPLE_STORIES.map((story, index) => (
            <Fragment key={story.headline}>
              {index > 0 && <Separator render={<li aria-hidden="true" />} />}
              <li className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-1">
                  {story.tickers.map((ticker) => (
                    <Badge key={ticker} variant="secondary">
                      {ticker}
                    </Badge>
                  ))}
                </div>
                <p className="font-medium">{story.headline}</p>
                <p className="text-xs text-muted-foreground">
                  {story.sources} sources, grouped into one story
                </p>
              </li>
            </Fragment>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
