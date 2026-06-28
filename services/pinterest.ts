
import { PinterestBoard, PinterestPin, IdeaList } from '../types';

const PINTEREST_API = 'https://api.pinterest.com/v5';

async function pinterestFetch<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${PINTEREST_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.message || `Pinterest API error: ${response.status}`);
  }

  return response.json();
}

export async function getPinterestBoards(accessToken: string): Promise<PinterestBoard[]> {
  const data = await pinterestFetch<{ items: any[] }>('/boards', accessToken);
  return (data.items ?? []).map((b: any) => ({
    id: b.id,
    name: b.name,
    description: b.description ?? '',
    pinCount: b.pin_count ?? 0,
    privacy: b.privacy ?? 'PUBLIC',
  }));
}

export async function getPinterestUserInfo(accessToken: string): Promise<{ username: string; id: string }> {
  const data = await pinterestFetch<any>('/user_account', accessToken);
  return { username: data.username ?? '', id: data.id ?? '' };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function uploadPinterestMedia(
  imageDataUrl: string,
  accessToken: string
): Promise<string> {
  // Step 1: Request upload URL from Pinterest
  const registerRes = await pinterestFetch<{ upload_url: string; media_id: string }>(
    '/media',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ media_type: 'image' }),
    }
  );

  // Step 2: Upload image to the presigned URL
  const blob = dataUrlToBlob(imageDataUrl);
  const uploadRes = await fetch(registerRes.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type },
    body: blob,
  });

  if (!uploadRes.ok) {
    throw new Error(`Image upload failed: ${uploadRes.status}`);
  }

  return registerRes.media_id;
}

export async function publishPin(
  pin: PinterestPin,
  accessToken: string
): Promise<string> {
  let mediaSource: any;

  if (pin.imageUrl.startsWith('data:')) {
    // Upload image first, then reference by media_id
    const mediaId = await uploadPinterestMedia(pin.imageUrl, accessToken);
    mediaSource = { source_type: 'image_id', image_id: mediaId };
  } else {
    mediaSource = { source_type: 'image_url', url: pin.imageUrl };
  }

  const body: any = {
    board_id: pin.boardId,
    title: pin.title,
    description: `${pin.description}\n\n${pin.hashtags.map(h => `#${h}`).join(' ')}`,
    link: pin.affiliateLink,
    media_source: mediaSource,
  };

  if (pin.scheduledAt) {
    // Pinterest requires ISO 8601, at least 5 minutes in the future
    body.publish_date = new Date(pin.scheduledAt).toISOString();
  }

  const result = await pinterestFetch<{ id: string }>('/pins', accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return result.id;
}

export async function publishIdeaPin(
  ideaList: IdeaList,
  accessToken: string
): Promise<string> {
  const items = await Promise.all(
    ideaList.pages.map(async (page, idx) => {
      const item: any = {
        title: page.title,
        description: page.description,
      };

      if (page.imageUrl) {
        if (page.imageUrl.startsWith('data:')) {
          const mediaId = await uploadPinterestMedia(page.imageUrl, accessToken);
          item.media = { images: { media_id: mediaId } };
        } else {
          item.media = { images: { url: page.imageUrl } };
        }
      }

      return item;
    })
  );

  const body = {
    board_id: ideaList.boardId,
    title: ideaList.title,
    description: ideaList.description,
    idea_pins_data: { items },
  };

  const result = await pinterestFetch<{ id: string }>('/pins', accessToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return result.id;
}
