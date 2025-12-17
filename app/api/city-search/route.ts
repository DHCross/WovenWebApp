import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface GeoNamesResult {
  geonames?: Array<{
    geonameId: number;
    name: string;
    lat: string;
    lng: string;
    countryCode: string;
    countryName: string;
    adminCode1?: string;
    adminName1?: string;
    population: number;
    timezone?: {
      timeZoneId?: string;
    };
  }>;
}

interface TimezoneResult {
  timezoneId?: string;
  timezone?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const username = process.env.GEONAMES_USERNAME;
  if (!username) {
    // GEONAMES_USERNAME not configured - return service unavailable
    return NextResponse.json(
      { error: 'City search not configured' },
      { status: 503 }
    );
  }

  try {
    const searchUrl = new URL('http://api.geonames.org/searchJSON');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('maxRows', '8');
    searchUrl.searchParams.set('featureClass', 'P'); // Populated places only
    searchUrl.searchParams.set('style', 'MEDIUM');
    searchUrl.searchParams.set('username', username);

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      // GeoNames API error - return bad gateway
      return NextResponse.json(
        { error: 'City search failed' },
        { status: 502 }
      );
    }

    const data: GeoNamesResult = await response.json();

    if (!data.geonames || !Array.isArray(data.geonames)) {
      return NextResponse.json({ results: [] });
    }

    // Fetch timezone for each result (in parallel, but limit to avoid rate limits)
    const resultsWithTimezone = await Promise.all(
      data.geonames.slice(0, 5).map(async (place) => {
        let timezone = 'UTC';
        
        try {
          const tzUrl = new URL('http://api.geonames.org/timezoneJSON');
          tzUrl.searchParams.set('lat', place.lat);
          tzUrl.searchParams.set('lng', place.lng);
          tzUrl.searchParams.set('username', username);

          const tzResponse = await fetch(tzUrl.toString());
          if (tzResponse.ok) {
            const tzData: TimezoneResult = await tzResponse.json();
            timezone = tzData.timezoneId || tzData.timezone || 'UTC';
          }
        } catch {
          // Fall back to UTC if timezone lookup fails
        }

        return {
          id: place.geonameId,
          name: place.name,
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lng),
          country: place.countryCode,
          countryName: place.countryName,
          adminCode: place.adminCode1 || null,
          adminName: place.adminName1 || null,
          population: place.population,
          timezone,
        };
      })
    );

    return NextResponse.json({ results: resultsWithTimezone });
  } catch {
    // City search failed - return internal server error
    return NextResponse.json(
      { error: 'City search failed' },
      { status: 500 }
    );
  }
}
