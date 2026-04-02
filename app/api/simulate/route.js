import { NextResponse } from 'next/server';
import { addAuditEvent } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

function isoNow() {
  return new Date().toISOString();
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      schoolId,
      deviceId,
      currentReadingM3 = 0,
      points = 3,
      stepM3 = 1.5,
      sendToExistingApi = false,
      includeCaptado = true,
      includeNivel = true
    } = body || {};

    if (!schoolId || !deviceId) {
      return NextResponse.json({ error: 'schoolId and deviceId are required' }, { status: 400 });
    }

    const measurements = [];
    let running = Number(currentReadingM3);

    for (let i = 0; i < points; i += 1) {
      const ts = new Date(Date.now() - (points - i - 1) * 60 * 1000).toISOString();
      const increment = Number((stepM3 + rand(-0.4, 0.8)).toFixed(2));
      running = Number((running + increment).toFixed(2));
      const pulses = Math.round(increment * 100);
      const rainPulses = Math.max(0, Math.round(rand(0, 10)));
      const levelMeters = Number(rand(0.2, 2.2).toFixed(2));

      measurements.push({
        schoolId,
        deviceId,
        used_at: ts,
        catched_at: ts,
        incrementM3: increment,
        cumulativeM3: running,
        utilizado: {
          tlaloque_id: deviceId,
          pulses,
          used_at: ts
        },
        captado: {
          tlaloque_id: deviceId,
          pulses: rainPulses,
          catched_at: ts
        },
        nivel: {
          tlaloque_id: deviceId,
          meters: levelMeters,
          catched_at: ts
        }
      });
    }

    const localCalls = [];
    for (const m of measurements) {
      localCalls.push(fetch(new URL('/api/utilizado', request.url), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(m.utilizado)
      }));

      if (includeCaptado) {
        localCalls.push(fetch(new URL('/api/captado', request.url), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(m.captado)
        }));
      }

      if (includeNivel) {
        localCalls.push(fetch(new URL('/api/nivel', request.url), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(m.nivel)
        }));
      }
    }

    const localResults = await Promise.allSettled(localCalls);

    const forwardResults = [];
    if (sendToExistingApi && process.env.SSCAP_API_BASE_URL) {
      const base = process.env.SSCAP_API_BASE_URL.replace(/\/$/, '');
      for (const m of measurements) {
        const jobs = [
          ['utilizado', m.utilizado],
          ...(includeCaptado ? [['captado', m.captado]] : []),
          ...(includeNivel ? [['nivel', m.nivel]] : [])
        ];

        for (const [type, payload] of jobs) {
          try {
            const res = await fetch(`${base}/api/${type}`, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                ...(process.env.SSCAP_API_TOKEN
                  ? { authorization: `Bearer ${process.env.SSCAP_API_TOKEN}` }
                  : {})
              },
              body: JSON.stringify(payload),
              cache: 'no-store'
            });
            forwardResults.push({ type, status: res.status, ok: res.ok });
          } catch (error) {
            forwardResults.push({ type, ok: false, error: String(error) });
          }
        }
      }
    }

    const event = addAuditEvent({
      type: 'simulation_run',
      source: 'api/simulate',
      schoolId,
      deviceId,
      points,
      at: isoNow(),
      sentToExistingApi: Boolean(sendToExistingApi && process.env.SSCAP_API_BASE_URL)
    });

    return NextResponse.json({
      ok: true,
      event,
      measurements,
      localIngestion: {
        attempted: localResults.length,
        succeeded: localResults.filter((r) => r.status === 'fulfilled').length
      },
      forwarded: {
        enabled: Boolean(sendToExistingApi),
        configured: Boolean(process.env.SSCAP_API_BASE_URL),
        results: forwardResults
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to run simulation' }, { status: 500 });
  }
}
