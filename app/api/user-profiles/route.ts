import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';

const logger = {
  info: (msg: string, meta?: any) => console.log(`[user-profiles] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[user-profiles] ${msg}`, meta || ''),
};

interface BirthProfile {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthState?: string;
  birthCountry?: string;
  timezone?: string;
  lat?: number;
  lng?: number;
  notes?: string;
}

interface UserProfiles {
  userId: string;
  profiles: BirthProfile[];
  lastUpdated: string;
}

/**
 * GET /api/user-profiles?userId=<auth0_sub>
 * Retrieve all saved profiles for a user
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      );
    }

    const store = getStore('user-profiles');
    const data = await store.get(`user_${userId}`);
    
    if (!data) {
      logger.info('No profiles found for user', { userId });
      return NextResponse.json({
        success: true,
        profiles: [],
        userId
      });
    }

    // Netlify Blobs returns ArrayBuffer, convert to string
    const dataString = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
    const parsed: UserProfiles = JSON.parse(dataString);
    logger.info('Profiles retrieved', { userId, count: parsed.profiles.length });
    
    return NextResponse.json({
      success: true,
      profiles: parsed.profiles,
      userId: parsed.userId,
      lastUpdated: parsed.lastUpdated
    });
  } catch (error: any) {
    logger.error('GET failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve profiles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-profiles
 * Save or update profiles for a user
 * Body: { userId, profiles }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, profiles } = body;

    if (!userId || !Array.isArray(profiles)) {
      return NextResponse.json(
        { success: false, error: 'userId and profiles array required' },
        { status: 400 }
      );
    }

    // Validate profile structure
    for (const profile of profiles) {
      if (!profile.id || !profile.name || !profile.birthDate) {
        return NextResponse.json(
          { success: false, error: 'Each profile must have id, name, and birthDate' },
          { status: 400 }
        );
      }
    }

    const userProfiles: UserProfiles = {
      userId,
      profiles,
      lastUpdated: new Date().toISOString()
    };

    const store = getStore('user-profiles');
    await store.set(`user_${userId}`, JSON.stringify(userProfiles));

    logger.info('Profiles saved', { userId, count: profiles.length });

    return NextResponse.json({
      success: true,
      userId,
      profileCount: profiles.length,
      lastUpdated: userProfiles.lastUpdated
    });
  } catch (error: any) {
    logger.error('POST failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: 'Failed to save profiles' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user-profiles?userId=<auth0_sub>&profileId=<profile_id>
 * Delete a specific profile
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const profileId = req.nextUrl.searchParams.get('profileId');

    if (!userId || !profileId) {
      return NextResponse.json(
        { success: false, error: 'userId and profileId required' },
        { status: 400 }
      );
    }

    const store = getStore('user-profiles');
    const data = await store.get(`user_${userId}`);

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'No profiles found for user' },
        { status: 404 }
      );
    }

    // Netlify Blobs returns ArrayBuffer, convert to string
    const dataString = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
    const parsed: UserProfiles = JSON.parse(dataString);
    const filteredProfiles = parsed.profiles.filter(p => p.id !== profileId);

    if (filteredProfiles.length === parsed.profiles.length) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    const updated: UserProfiles = {
      userId,
      profiles: filteredProfiles,
      lastUpdated: new Date().toISOString()
    };

    await store.set(`user_${userId}`, JSON.stringify(updated));

    logger.info('Profile deleted', { userId, profileId });

    return NextResponse.json({
      success: true,
      userId,
      profileCount: filteredProfiles.length
    });
  } catch (error: any) {
    logger.error('DELETE failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: 'Failed to delete profile' },
      { status: 500 }
    );
  }
}
