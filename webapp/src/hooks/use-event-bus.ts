import { decodeJWT } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { events } from 'aws-amplify/data';
import { useEffect } from 'react';

const eventHttpEndpoint = process.env.NEXT_PUBLIC_EVENT_HTTP_ENDPOINT;
const eventBusEnabled = eventHttpEndpoint != null && eventHttpEndpoint !== '' && process.env.NEXT_PUBLIC_DISABLE_EVENT_BUS !== 'true';

if (eventBusEnabled) {
  Amplify.configure(
    {
      API: {
        Events: {
          endpoint: `${eventHttpEndpoint}/event`,
          region: process.env.NEXT_PUBLIC_AWS_REGION,
          defaultAuthMode: 'userPool',
        },
      },
    },
    {
      Auth: {
        tokenProvider: {
          getTokens: async () => {
            const res = await fetch('/api/cognito-token');
            const { accessToken } = await res.json();
            return {
              accessToken: decodeJWT(accessToken),
            };
          },
        },
      },
    },
  );
}

type UseEventBusProps = {
  channelName: string;
  onReceived: (payload: unknown) => void;
};

export const useEventBus = ({ channelName, onReceived }: UseEventBusProps) => {
  useEffect(() => {
    if (!eventBusEnabled) {
      return;
    }

    const connectAndSubscribe = async () => {
      const channel = await events.connect(`event-bus/${channelName}`);
      console.log(`subscribing channel ${channelName}`);

      channel.subscribe({
        next: (data) => {
          onReceived(data);
        },
        error: (err) => console.error('error', err),
      });
      return channel;
    };

    const pr = connectAndSubscribe();

    return () => {
      pr.then((channel) => {
        channel.close();
      });
    };
  }, [channelName, onReceived]);
};
