'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const BUYERS = [
  { id: 'buyer-1', name: 'Acme Manufacturing', approved: true, role: 'buyer' },
  { id: 'buyer-2', name: 'Pending Buyer LLC', approved: false, role: 'buyer' }
];

const METHOD_VERSION = 'VWBA-0.9-demo';

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function statusBadge(status) {
  if (status === 'approved') return 'good';
  if (status === 'under_review') return 'warn';
  if (status === 'suspended' || status === 'rejected') return 'bad';
  return 'info';
}

function meterBadge(status) {
  if (status === 'online') return 'good';
  if (status === 'delayed') return 'warn';
  return 'bad';
}

const RealMapClient = dynamic(() => import('@/components/RealMapClient'), { ssr: false });

export default function Page() {
  const [schools, setSchools] = useState([]);
  const [projects, setProjects] = useState([]);
  const [basins, setBasins] = useState({ type: 'FeatureCollection', features: [] });
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [reviews, setReviews] = useState({});
  const [issuances, setIssuances] = useState([]);
  const [retirements, setRetirements] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState(BUYERS[0].id);
  const [retireQty, setRetireQty] = useState('10');
  const [retirePurpose, setRetirePurpose] = useState('Demo day retirement claim');
  const [newProject, setNewProject] = useState({
    projectName: '',
    projectType: 'leak_reduction_efficiency',
    basinId: '',
    lat: '',
    lon: ''
  });
  const [simBusy, setSimBusy] = useState(false);
  const [apiDownload, setApiDownload] = useState(null);
  const [lastReport, setLastReport] = useState(null);
  const [basinError, setBasinError] = useState('');
  const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || '/';

  useEffect(() => {
    async function load() {
      const [schoolsData, projectsData, downloadData] = await Promise.all([
        fetch('/data/schools.cleaned.json').then((r) => r.json()),
        fetch('/data/projects.seed.json').then((r) => r.json()),
        fetch('/api/download').then((r) => r.json())
      ]);

      let basinsData = { type: 'FeatureCollection', features: [] };
      try {
        const realResponse = await fetch('/data/hydrobasins_l6_schools.geojson');
        if (!realResponse.ok) {
          throw new Error('Missing /public/data/hydrobasins_l6_schools.geojson');
        }
        basinsData = await realResponse.json();
      } catch (_error) {
        setBasinError(
          'Real HydroBASINS layer is missing. Generate public/data/hydrobasins_l6_schools.geojson using npm run extract:basins.'
        );
      }

      setSchools(schoolsData);
      setProjects(projectsData);
      setBasins(basinsData);
      setSelectedProjectId(projectsData[0]?.projectId || '');
      setApiDownload(downloadData);
      setTimeline((t) => [
        ...t,
        {
          at: new Date().toISOString(),
          text: `Loaded ${projectsData.length} seeded projects and ${basinsData.features.length} HydroBASINS polygons.`
        }
      ]);
    }

    load();
  }, []);

  const selectedProject = useMemo(
    () => projects.find((p) => p.projectId === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const selectedSchool = useMemo(() => {
    if (!selectedProject) return null;
    const device = selectedProject.linkedDeviceIds?.[0];
    return schools.find((s) => s.meter?.deviceId === device) || null;
  }, [selectedProject, schools]);

  const totalIssued = useMemo(() => issuances.reduce((sum, x) => sum + x.quantity, 0), [issuances]);
  const totalRetired = useMemo(() => retirements.reduce((sum, x) => sum + x.quantity, 0), [retirements]);
  const availableBalance = Math.max(0, totalIssued - totalRetired);

  function addTimeline(text) {
    setTimeline((prev) => [{ at: new Date().toISOString(), text }, ...prev].slice(0, 60));
  }

  async function recordAudit(event) {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (_error) {
      // Keep demo flow resilient even if audit persistence fails.
    }
  }

  function createProject() {
    if (!newProject.projectName.trim()) return;
    const id = `BL-PROJ-${String(projects.length + 1).padStart(3, '0')}`;
    const created = {
      projectId: id,
      projectName: newProject.projectName,
      projectType: newProject.projectType,
      location: {
        basinId: newProject.basinId || 'UNIDENTIFIED',
        municipality: 'Custom',
        state: 'Estado de Mexico',
        country: 'Mexico',
        lat: newProject.lat ? Number(newProject.lat) : null,
        lon: newProject.lon ? Number(newProject.lon) : null
      },
      operator: 'Demo Admin',
      status: 'draft',
      linkedDeviceIds: [`tlaloque-${id}`],
      evidenceFiles: [],
      certificationReviewer: 'Pending assignment',
      methodologyStatus: 'draft',
      notes: 'Created during demo.'
    };
    setProjects((p) => [created, ...p]);
    setSelectedProjectId(id);
    setNewProject({ projectName: '', projectType: 'leak_reduction_efficiency', basinId: '', lat: '', lon: '' });
    addTimeline(`Created project ${id} (${created.projectName}).`);
    recordAudit({ type: 'project_created', projectId: id, projectName: created.projectName });
  }

  function runAiReviewRecommendation(project) {
    const recommendation = project.projectType === 'desalination_treatment' ? 'VWBA.TREATMENT.01' : 'VWBA.EFFICIENCY.02';
    const missing = project.evidenceFiles?.length ? [] : ['At least one evidence document'];
    const confidence = missing.length ? 0.66 : 0.91;
    return {
      recommendation,
      confidence,
      missing,
      summary:
        recommendation === 'VWBA.TREATMENT.01'
          ? 'Method suggests treatment outcomes with volumetric compliance checks.'
          : 'Method suggests avoided-loss / efficiency outcomes from monitored usage deltas.'
    };
  }

  function saveReview(decision) {
    if (!selectedProject) return;
    const ai = runAiReviewRecommendation(selectedProject);
    const review = {
      reviewer: 'Demo Reviewer',
      decision,
      timestamp: new Date().toISOString(),
      methodologyVersion: METHOD_VERSION,
      ai
    };
    setReviews((r) => ({ ...r, [selectedProject.projectId]: review }));
    setProjects((ps) =>
      ps.map((p) =>
        p.projectId === selectedProject.projectId
          ? {
              ...p,
              status: decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'under_review',
              certificationReviewer: review.reviewer,
              methodologyStatus: decision === 'approve' ? 'approved' : 'needs_update'
            }
          : p
      )
    );
    addTimeline(`${review.reviewer} set ${selectedProject.projectId} to ${decision}.`);
    recordAudit({
      type: 'review_decision',
      projectId: selectedProject.projectId,
      reviewer: review.reviewer,
      decision,
      methodologyVersion: METHOD_VERSION
    });
  }

  function issueWbt() {
    if (!selectedProject) return;
    const review = reviews[selectedProject.projectId];
    if (!review || review.decision !== 'approve') {
      addTimeline(`Issuance blocked for ${selectedProject.projectId}: review approval required.`);
      return;
    }

    const latest = selectedSchool?.meter?.latestReadingM3 || 0;
    const eligibleVolume = Number((latest * 0.85).toFixed(2));
    const quantity = Math.max(1, Math.floor(eligibleVolume));

    const batch = {
      issuanceId: `ISS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      projectId: selectedProject.projectId,
      projectName: selectedProject.projectName,
      quantity,
      eligibleVolume,
      methodologyVersion: METHOD_VERSION,
      reviewer: review.reviewer,
      period: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString()
    };

    setIssuances((x) => [batch, ...x]);
    addTimeline(`Issued ${quantity} WBT from ${selectedProject.projectId}.`);
    recordAudit({
      type: 'issuance_created',
      issuanceId: batch.issuanceId,
      projectId: batch.projectId,
      quantity: batch.quantity,
      reviewer: batch.reviewer,
      methodologyVersion: batch.methodologyVersion
    });
  }

  async function runSimulation() {
    if (!selectedProject) return;
    setSimBusy(true);
    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          schoolId: selectedProject.projectId,
          deviceId: selectedProject.linkedDeviceIds[0],
          currentReadingM3: selectedSchool?.meter?.latestReadingM3 || 0,
          points: 4,
          stepM3: 1.2,
          sendToExistingApi: true
        })
      });
      const result = await response.json();
      if (result.ok) {
        const latest = result.measurements[result.measurements.length - 1];
        setSchools((prev) =>
          prev.map((s) =>
            s.meter?.deviceId === selectedProject.linkedDeviceIds[0]
              ? {
                  ...s,
                  meter: {
                    ...s.meter,
                    latestReadingM3: latest.cumulativeM3,
                    status: 'online'
                  }
                }
              : s
          )
        );
        addTimeline(
          `Simulated ${result.measurements.length} points for ${selectedProject.projectId}. Existing API forwarding configured: ${String(
            result.forwarded.configured
          )}.`
        );
      }
      const latestDownload = await fetch('/api/download').then((r) => r.json());
      setApiDownload(latestDownload);
    } finally {
      setSimBusy(false);
    }
  }

  async function retireWbt() {
    const buyer = BUYERS.find((b) => b.id === selectedBuyerId);
    const qty = Number(retireQty);
    if (!buyer?.approved || !qty || qty <= 0 || qty > availableBalance) {
      addTimeline('Retirement blocked: buyer approval/balance constraints not satisfied.');
      return;
    }

    const sourceIssuance = issuances[0];
    const retirement = {
      retirementId: `RET-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      buyer: buyer.name,
      quantity: qty,
      purpose: retirePurpose,
      issuedFrom: sourceIssuance?.issuanceId || 'N/A',
      projectId: sourceIssuance?.projectId || selectedProject?.projectId || 'N/A',
      methodologyVersion: sourceIssuance?.methodologyVersion || METHOD_VERSION,
      reviewer: sourceIssuance?.reviewer || 'N/A',
      at: new Date().toISOString()
    };

    const certificate = {
      certificateId: `CERT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      title: 'Blue Lifeline Verified Water Benefit Retirement Certificate',
      claimSafeLanguage:
        'This retirement certifies audited retirement of permissioned Water Benefit Tokens linked to approved verified volume under stated methodology and review controls.',
      ...retirement
    };

    const report = {
      reportId: `RPT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      buyer: retirement.buyer,
      projectId: retirement.projectId,
      location: selectedProject?.location || null,
      deviceReference: selectedProject?.linkedDeviceIds?.[0] || null,
      issuanceBatch: retirement.issuedFrom,
      volumeRetired: qty,
      retirementDate: retirement.at,
      methodologyVersion: retirement.methodologyVersion,
      reviewer: retirement.reviewer,
      claimSafeWording: certificate.claimSafeLanguage
    };

    setRetirements((x) => [retirement, ...x]);
    setLastReport({ certificate, report });
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ certificate, report })
    });

    const latestDownload = await fetch('/api/download').then((r) => r.json());
    setApiDownload(latestDownload);
    addTimeline(`Retired ${qty} WBT for ${buyer.name}; generated certificate ${certificate.certificateId}.`);
    recordAudit({
      type: 'retirement_created',
      retirementId: retirement.retirementId,
      buyer: retirement.buyer,
      quantity: retirement.quantity,
      projectId: retirement.projectId
    });
  }

  const aiForSelected = selectedProject ? runAiReviewRecommendation(selectedProject) : null;
  const selectedTechnical = selectedSchool?.technical || null;

  return (
    <main className="page">
      <section className="header">
        <div>
          <h1 className="title">Blue Lifeline Demo Day Console</h1>
          <p className="subtitle">
            End-to-end path: project onboarding, meter ingestion, certification approval, VWB issuance, buyer retirement,
            and report generation. Includes schools dataset, simulated SSCAP measurements, and basin vs school localization.
          </p>
          <p className="subtitle">
            Demo link:{' '}
            <a href={demoUrl} target="_blank" rel="noreferrer">
              {demoUrl}
            </a>
          </p>
        </div>
      </section>

      <section className="kpis">
        <div className="kpi">
          <div className="label">Projects</div>
          <div className="value">{projects.length}</div>
        </div>
        <div className="kpi">
          <div className="label">Total Issued WBT</div>
          <div className="value">{fmt(totalIssued)}</div>
        </div>
        <div className="kpi">
          <div className="label">Total Retired WBT</div>
          <div className="value">{fmt(totalRetired)}</div>
        </div>
        <div className="kpi">
          <div className="label">Available Balance</div>
          <div className="value">{fmt(availableBalance)}</div>
        </div>
        <div className="kpi">
          <div className="label">Meter Records Ingested</div>
          <div className="value">{apiDownload?.records?.length || 0}</div>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>1) Project Onboarding</h2>
          <div className="row">
            <input
              value={newProject.projectName}
              placeholder="Project name"
              onChange={(e) => setNewProject((x) => ({ ...x, projectName: e.target.value }))}
            />
            <select
              value={newProject.projectType}
              onChange={(e) => setNewProject((x) => ({ ...x, projectType: e.target.value }))}
            >
              <option value="leak_reduction_efficiency">Leak reduction / efficiency</option>
              <option value="desalination_treatment">Desalination / treatment</option>
            </select>
          </div>
          <div className="row">
            <input
              value={newProject.basinId}
              placeholder="Basin ID"
              onChange={(e) => setNewProject((x) => ({ ...x, basinId: e.target.value }))}
            />
            <input value={newProject.lat} placeholder="Lat" onChange={(e) => setNewProject((x) => ({ ...x, lat: e.target.value }))} />
            <input value={newProject.lon} placeholder="Lon" onChange={(e) => setNewProject((x) => ({ ...x, lon: e.target.value }))} />
            <button onClick={createProject}>Create project</button>
          </div>

          <div className="list">
            {projects.map((p) => (
              <div key={p.projectId} className="item">
                <strong>{p.projectId}</strong> · {p.projectName}
                <div>
                  <span className={`badge ${statusBadge(p.status)}`}>{p.status}</span>{' '}
                  <span className="badge info">{p.projectType}</span>{' '}
                  <span className="badge info">{p.location?.basinId}</span>
                </div>
                <button className="secondary" onClick={() => setSelectedProjectId(p.projectId)}>
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>2) Basin vs School Localization</h2>
          {basinError ? (
            <div className="code">{basinError}</div>
          ) : (
            <RealMapClient
              schools={schools}
              basins={basins}
              selectedDeviceId={selectedProject?.linkedDeviceIds?.[0] || null}
            />
          )}
          <p>
            Basins shown: {(basins.features || []).length}. Schools mapped: {schools.filter((s) => typeof s.lat === 'number').length}.
            Source: <span className="badge good">HydroBASINS (real only)</span>
          </p>
        </div>

        <div className="card">
          <h2>2b) School Technical Dossier (BL_IU_Technical)</h2>
          {!selectedSchool ? (
            <p>Select a project to view school technical details.</p>
          ) : !selectedTechnical ? (
            <p>No BL_IU_Technical dossier found for school {selectedSchool.schoolId}.</p>
          ) : (
            <>
              <p>
                <strong>{selectedSchool.schoolName}</strong> ({selectedSchool.schoolId})
              </p>
              <div className="row">
                <span className="badge info">Files: {selectedTechnical.fileCount}</span>
                <span className="badge info">Reports: {selectedTechnical.pdfCount}</span>
                <span className="badge info">Photos: {selectedTechnical.imageCount}</span>
                <span className="badge info">
                  Rain {selectedTechnical.precipitation?.latestYear || 'N/A'}:{' '}
                  {fmt(selectedTechnical.precipitation?.latestYearTotalMm || 0)} mm
                </span>
              </div>
              <p>
                Precipitation station: {selectedTechnical.precipitation?.stationLat ?? 'N/A'},{' '}
                {selectedTechnical.precipitation?.stationLon ?? 'N/A'} · Peak cumulative day value:{' '}
                {fmt(selectedTechnical.precipitation?.maxDailyMm || 0)} mm
              </p>
              <div className="code">{JSON.stringify(selectedTechnical.reportFiles || [], null, 2)}</div>
            </>
          )}
        </div>

        <div className="card">
          <h2>3) Meter Ingestion + Existing API Replay</h2>
          <p>
            Selected project: <strong>{selectedProject?.projectId || 'None'}</strong>
            {selectedSchool ? (
              <>
                {' '}
                · device <strong>{selectedSchool.meter.deviceId}</strong> · current reading{' '}
                <strong>{fmt(selectedSchool.meter.latestReadingM3)} m³</strong>
              </>
            ) : null}
          </p>
          <div className="row">
            <button disabled={!selectedProject || simBusy} onClick={runSimulation}>
              {simBusy ? 'Simulating...' : 'Simulate + send to APIs'}
            </button>
            <span className={`badge ${meterBadge(selectedSchool?.meter?.status || 'suspect')}`}>
              meter {selectedSchool?.meter?.status || 'unknown'}
            </span>
          </div>
          <div className="code">{JSON.stringify(apiDownload?.records?.slice(0, 8) || [], null, 2)}</div>
        </div>

        <div className="card">
          <h2>4) Certification Review Workspace</h2>
          <p>
            AI recommendation: <strong>{aiForSelected?.recommendation || 'N/A'}</strong> · confidence {fmt((aiForSelected?.confidence || 0) * 100)}%
          </p>
          <p>{aiForSelected?.summary}</p>
          <p>Missing evidence: {aiForSelected?.missing?.length ? aiForSelected.missing.join(', ') : 'None'}</p>
          <div className="row">
            <button disabled={!selectedProject} onClick={() => saveReview('approve')}>
              Human approve
            </button>
            <button className="secondary" disabled={!selectedProject} onClick={() => saveReview('request_info')}>
              Request info
            </button>
            <button className="secondary" disabled={!selectedProject} onClick={() => saveReview('reject')}>
              Reject
            </button>
          </div>
          <div className="code">{JSON.stringify(selectedProject ? reviews[selectedProject.projectId] || {} : {}, null, 2)}</div>
        </div>

        <div className="card">
          <h2>5) VWB Eligibility / WBT Issuance</h2>
          <p>
            Issuance is approval-gated and uses deterministic demo logic: <code>eligibleVolume = latestMeter * 0.85</code>;
            <code>WBT quantity = floor(eligibleVolume)</code>.
          </p>
          <div className="row">
            <button disabled={!selectedProject} onClick={issueWbt}>
              Issue WBT from selected project
            </button>
          </div>
          <div className="list">
            {issuances.length === 0 ? (
              <div className="item">No issuance batches yet.</div>
            ) : (
              issuances.map((x) => (
                <div className="item" key={x.issuanceId}>
                  <strong>{x.issuanceId}</strong> · {x.projectId} · {fmt(x.quantity)} WBT · reviewer {x.reviewer}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2>6) Permissioned Buyer + Retirement</h2>
          <div className="row">
            <select value={selectedBuyerId} onChange={(e) => setSelectedBuyerId(e.target.value)}>
              {BUYERS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.approved ? 'approved' : 'unapproved'})
                </option>
              ))}
            </select>
            <input value={retireQty} onChange={(e) => setRetireQty(e.target.value)} placeholder="Quantity" />
          </div>
          <textarea value={retirePurpose} rows={3} onChange={(e) => setRetirePurpose(e.target.value)} />
          <div className="row">
            <button onClick={retireWbt}>Retire WBT</button>
            <span className="badge info">before: {fmt(availableBalance)} WBT available</span>
          </div>
          <div className="list">
            {retirements.length === 0 ? (
              <div className="item">No retirement events yet.</div>
            ) : (
              retirements.map((r) => (
                <div className="item" key={r.retirementId}>
                  <strong>{r.retirementId}</strong> · {r.buyer} · {fmt(r.quantity)} WBT retired
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2>7) Certificate + Report Output</h2>
          <p>Generated immediately at retirement and persisted via <code>/api/reports</code>.</p>
          <div className="code">{JSON.stringify(lastReport || { message: 'No report generated yet.' }, null, 2)}</div>
        </div>

        <div className="card">
          <h2>Audit Timeline</h2>
          <div className="timeline">
            {timeline.map((t, idx) => (
              <p key={`${t.at}-${idx}`}>
                <strong>{new Date(t.at).toLocaleTimeString()}</strong> · {t.text}
              </p>
            ))}
          </div>
          <p>
            Download endpoint: <code>/api/download</code> includes sensor records, demo events, and generated reports for demo traceability.
          </p>
        </div>
      </section>
    </main>
  );
}
