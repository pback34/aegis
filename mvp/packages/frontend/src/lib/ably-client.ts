import * as Ably from 'ably';

let ablyClient: Ably.Realtime | null = null;

/**
 * Get or create the Ably client instance
 */
export function getAblyClient(ablyKey: string): Ably.Realtime {
  if (!ablyClient || ablyClient.connection.state === 'closed' || ablyClient.connection.state === 'failed') {
    ablyClient = new Ably.Realtime({
      key: ablyKey,
      echoMessages: false,
    });
  }
  return ablyClient;
}

/**
 * Close the Ably client connection
 */
export function closeAblyClient(): void {
  if (ablyClient) {
    ablyClient.close();
    ablyClient = null;
  }
}

/**
 * Subscribe to location updates for a specific job
 */
export function subscribeToJobLocation(
  ablyKey: string,
  jobId: string,
  onLocationUpdate: (data: LocationUpdateEvent) => void,
  onError?: (error: Ably.ErrorInfo) => void
): () => void {
  const client = getAblyClient(ablyKey);
  const channelName = `jobs:${jobId}:location`;
  const channel = client.channels.get(channelName);

  // Subscribe to location updates
  channel.subscribe('location-update', (message) => {
    onLocationUpdate(message.data);
  });

  // Handle connection errors
  if (onError) {
    channel.on('failed', (stateChange) => {
      if (stateChange.reason) {
        onError(stateChange.reason);
      }
    });
  }

  // Return unsubscribe function
  return () => {
    channel.unsubscribe('location-update');
    channel.detach();
  };
}

/**
 * Location update event data structure
 */
export interface LocationUpdateEvent {
  guardId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  timestamp: string;
}
