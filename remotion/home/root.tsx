import { Composition } from "remotion";

import { HomeWatchlistVideo } from "./videos/home-watchlist";

export function RemotionRoot() {
  return (
    <Composition
      id="HomeWatchlistVideo"
      component={HomeWatchlistVideo}
      durationInFrames={240}
      fps={30}
      width={1440}
      height={810}
    />
  );
}
