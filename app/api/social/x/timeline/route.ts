import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('w3-auth-x');

    if (!authCookie) {
      return NextResponse.json(
        { error: 'Not signed in with X' },
        { status: 401 }
      );
    }

    const auth = JSON.parse(authCookie.value);
    const accessToken = auth.accessToken;

    // Fetch user's tweets
    const userResponse = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'X access failed' },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();
    const userId = userData.data.id;

    // Fetch timeline
    const timelineResponse = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=20&tweet.fields=created_at,public_metrics,author_id&user.fields=name,username,profile_image_url&expansions=author_id`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!timelineResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch tweets' },
        { status: timelineResponse.status }
      );
    }

    const timelineData = await timelineResponse.json();

    const tweets = (timelineData.data || []).map((tweet: any) => ({
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
      likes: tweet.public_metrics?.like_count || 0,
      retweets: tweet.public_metrics?.retweet_count || 0,
      replies: tweet.public_metrics?.reply_count || 0,
    }));

    return NextResponse.json({
      user: userData.data,
      tweets,
    });
  } catch (error: any) {
    console.error('X timeline fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}
