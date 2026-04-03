'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const BUYERS = [
  { id: 'buyer-1', name: 'Acme Manufacturing', approved: true, role: 'buyer' },
  { id: 'buyer-2', name: 'Pending Buyer LLC', approved: false, role: 'buyer' }
];

const METHOD_VERSION = 'VWBA-0.9-demo';
const SCHOOL_PROJECT_TYPE = 'captacion_agua_de_lluvia_scall';
const SCHOOL_PROJECT_TYPE_LABEL = 'Captación de agua de lluvia (SCALL)';

const steps = [
  { id: 1, title: 'Project' },
  { id: 2, title: 'Map + Dossier' },
  { id: 3, title: 'Ingestion' },
  { id: 4, title: 'Certification' },
  { id: 5, title: 'Issuance' },
  { id: 6, title: 'Buyer + Retirement' },
  { id: 7, title: 'Certificate + Audit' }
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function monthKeyFromDate(dateLike) {
  const date = dateLike ? new Date(dateLike) : new Date();
  const month = Number.isNaN(date.getTime()) ? new Date().getMonth() + 1 : date.getMonth() + 1;
  return String(month).padStart(2, '0');
}

function quarterFromDate(dateLike) {
  const date = dateLike ? new Date(dateLike) : new Date();
  const month = Number.isNaN(date.getTime()) ? new Date().getMonth() + 1 : date.getMonth() + 1;
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}

function weekStartIso(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - dow + 1);
  return utc.toISOString().slice(0, 10);
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

function statusMeta(status) {
  if (status === 'approved') return { tone: 'good', icon: 'check', label: 'Approved' };
  if (status === 'under_review') return { tone: 'warn', icon: 'clock', label: 'Under Review' };
  if (status === 'draft') return { tone: 'info', icon: 'doc', label: 'Draft' };
  if (status === 'rejected') return { tone: 'bad', icon: 'x', label: 'Rejected' };
  if (status === 'suspended') return { tone: 'bad', icon: 'pause', label: 'Suspended' };
  return { tone: 'info', icon: 'dot', label: status || 'Unknown' };
}

function meterMeta(status) {
  if (status === 'online') return { tone: 'good', icon: 'wifi', label: 'Meter Online' };
  if (status === 'delayed') return { tone: 'warn', icon: 'clock', label: 'Meter Delayed' };
  if (status === 'suspect') return { tone: 'bad', icon: 'warn', label: 'Meter Suspect' };
  return { tone: 'info', icon: 'dot', label: 'Meter Unknown' };
}

function reviewMeta(decision) {
  if (decision === 'approve') return { tone: 'good', icon: 'check', label: 'Human Approved' };
  if (decision === 'request_info') return { tone: 'warn', icon: 'warn', label: 'Needs Info' };
  if (decision === 'reject') return { tone: 'bad', icon: 'x', label: 'Rejected' };
  return { tone: 'info', icon: 'dot', label: 'No Decision' };
}

function StatusPill({ tone, icon, label }) {
  const common = {
    className: 'statusSvg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true'
  };

  function IconGlyph() {
    if (icon === 'check') {
      return (
        <svg {...common}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    }
    if (icon === 'x') {
      return (
        <svg {...common}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    }
    if (icon === 'clock') {
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      );
    }
    if (icon === 'warn') {
      return (
        <svg {...common}>
          <path d="M12 3L2.5 20.5h19L12 3z" />
          <line x1="12" y1="9" x2="12" y2="14" />
          <circle cx="12" cy="17.2" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    }
    if (icon === 'pause') {
      return (
        <svg {...common}>
          <rect x="6.5" y="5.5" width="4" height="13" />
          <rect x="13.5" y="5.5" width="4" height="13" />
        </svg>
      );
    }
    if (icon === 'doc') {
      return (
        <svg {...common}>
          <path d="M7 3.5h7l4 4V20.5H7z" />
          <polyline points="14 3.5 14 8 18 8" />
          <line x1="9.5" y1="12" x2="15.5" y2="12" />
          <line x1="9.5" y1="15" x2="15.5" y2="15" />
        </svg>
      );
    }
    if (icon === 'wifi') {
      return (
        <svg {...common}>
          <path d="M4 9.5a12 12 0 0 1 16 0" />
          <path d="M7.5 13a7.5 7.5 0 0 1 9 0" />
          <path d="M11 16.5a3 3 0 0 1 2 0" />
          <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    }
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <span className={`statusPill ${tone}`}>
      <span className="statusIconWrap">
        <IconGlyph />
      </span>
      {label}
    </span>
  );
}

function MiniBarChart({ title, data, labelKey, valueKey, unit }) {
  const max = Math.max(1, ...data.map((x) => Number(x?.[valueKey] || 0)));
  return (
    <div className="chartCard">
      <h4>{title}</h4>
      {data.length === 0 ? (
        <p className="subtitle">No data</p>
      ) : (
        <div className="bars">
          {data.map((row) => {
            const value = Number(row?.[valueKey] || 0);
            const width = Math.max(4, Math.round((value / max) * 100));
            return (
              <div className="barRow" key={`${row?.[labelKey]}-${value}`}>
                <div className="barLabel">{row?.[labelKey]}</div>
                <div className="barTrack">
                  <div className="barFill" style={{ width: `${width}%` }} />
                </div>
                <div className="barValue">
                  {fmt(value)} {unit}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniLineChart({ title, points = [], unit = 'm3' }) {
  if (!points.length) {
    return (
      <div className="chartCard chartCardWide">
        <h4>{title}</h4>
        <p className="subtitle">No data</p>
      </div>
    );
  }

  const w = 640;
  const h = 200;
  const pad = 28;
  const maxY = Math.max(1, ...points.map((p) => Number(p.value || 0)));
  const minY = 0;
  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const yToPx = (v) => h - pad - ((v - minY) / (maxY - minY || 1)) * (h - pad * 2);

  const path = points
    .map((p, i) => {
      const x = pad + i * stepX;
      const y = yToPx(Number(p.value || 0));
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div className="chartCard chartCardWide">
      <h4>{title}</h4>
      <svg className="lineChart" viewBox={`0 0 ${w} ${h}`} aria-label={title}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#d4e2ec" strokeWidth="1" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#d4e2ec" strokeWidth="1" />
        <path d={path} fill="none" stroke="#0c9ccb" strokeWidth="2.5" />
      </svg>
      <div className="lineLegend">
        <span>
          Start: {points[0]?.label} · End: {points[points.length - 1]?.label}
        </span>
        <span>Peak: {fmt(maxY)} {unit}</span>
      </div>
    </div>
  );
}

function KpiIcon({ icon }) {
  const common = {
    className: 'kpiSvg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true'
  };
  if (icon === 'projects') {
    return (
      <svg {...common}>
        <rect x="3.5" y="4.5" width="7" height="7" />
        <rect x="13.5" y="4.5" width="7" height="7" />
        <rect x="3.5" y="14.5" width="7" height="7" />
        <rect x="13.5" y="14.5" width="7" height="7" />
      </svg>
    );
  }
  if (icon === 'issued') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v10" />
        <path d="M8.5 10.5l3.5-3.5 3.5 3.5" />
      </svg>
    );
  }
  if (icon === 'retired') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v10" />
        <path d="M8.5 13.5l3.5 3.5 3.5-3.5" />
      </svg>
    );
  }
  if (icon === 'balance') {
    return (
      <svg {...common}>
        <path d="M4 12h16" />
        <path d="M12 4v16" />
        <circle cx="12" cy="12" r="8.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 18.5h16" />
      <path d="M7 16V9.5" />
      <path d="M12 16V6.5" />
      <path d="M17 16V12.5" />
    </svg>
  );
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
    projectType: SCHOOL_PROJECT_TYPE,
    basinId: '',
    lat: '',
    lon: ''
  });
  const [simBusy, setSimBusy] = useState(false);
  const [apiDownload, setApiDownload] = useState(null);
  const [certificationData, setCertificationData] = useState(null);
  const [certificationError, setCertificationError] = useState('');
  const [certificationSourceMode, setCertificationSourceMode] = useState('api');
  const [certificationUploadName, setCertificationUploadName] = useState('');
  const [rainSeasonality, setRainSeasonality] = useState({ source: null, schools: {} });
  const [rainLoadError, setRainLoadError] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState(quarterFromDate());
  const [selectedBasinId, setSelectedBasinId] = useState('');
  const [approvedIssuanceBasis, setApprovedIssuanceBasis] = useState({});
  const [lastReport, setLastReport] = useState(null);
  const [basinError, setBasinError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || '/';

  async function loadCertificationFromApi() {
    const response = await fetch('/api/certification');
    const data = await response.json();
    if (!response.ok || data?.error) {
      throw new Error(data?.error || 'Failed to load certification aggregation pipeline.');
    }
    setCertificationData(data);
    setCertificationError('');
    setCertificationSourceMode('api');
    setCertificationUploadName('');
  }

  async function processCertificationUpload(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const response = await fetch('/api/certification', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceName: `upload:${file.name}`, downloadPayload: parsed })
    });
    const data = await response.json();
    if (!response.ok || data?.error) {
      throw new Error(data?.error || 'Uploaded JSON could not be processed.');
    }
    setCertificationData(data);
    setCertificationError('');
    setCertificationSourceMode('upload');
    setCertificationUploadName(file.name);
  }

  useEffect(() => {
    async function load() {
      const [schoolsData, projectsData, downloadData, rainResponse] = await Promise.all([
        fetch('/data/schools.cleaned.json').then((r) => r.json()),
        fetch('/data/projects.seed.json').then((r) => r.json()),
        fetch('/api/download').then((r) => r.json()),
        fetch('/data/rain_seasonality.json').catch(() => null)
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
          'Real HydroBASINS layer is missing. Generate public/data/hydrobasins_l6_schools.geojson using npm run fetch:hydrobasins.'
        );
      }

      setSchools(schoolsData);
      setProjects(projectsData);
      setBasins(basinsData);
      setSelectedProjectId(projectsData[0]?.projectId || '');
      setSelectedBasinId(projectsData[0]?.location?.basinId || schoolsData[0]?.basinId || '');
      setApiDownload(downloadData);
      try {
        await loadCertificationFromApi();
      } catch (error) {
        setCertificationError(error.message || 'Failed to load certification aggregation pipeline.');
      }
      if (rainResponse?.ok) {
        setRainSeasonality(await rainResponse.json());
      } else {
        setRainLoadError('Missing /public/data/rain_seasonality.json. Run npm run fetch:rain.');
      }
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

  useEffect(() => {
    if (!selectedProject) return;
    const nextBasin = selectedProject.location?.basinId || selectedSchool?.basinId || '';
    if (nextBasin) {
      setSelectedBasinId((prev) => prev || nextBasin);
    }
  }, [selectedProject, selectedSchool]);

  const selectedRainProfile = useMemo(
    () => (selectedSchool ? rainSeasonality?.schools?.[selectedSchool.schoolId] || null : null),
    [rainSeasonality, selectedSchool]
  );

  const basinQuarterAggregates = useMemo(() => certificationData?.aggregates || [], [certificationData]);
  const basinTotals = useMemo(() => certificationData?.basinTotals || [], [certificationData]);

  const basinOptions = useMemo(() => {
    const values = new Set();
    basinTotals.forEach((x) => values.add(x.basinId));
    schools.forEach((s) => values.add(s.basinId));
    return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [basinTotals, schools]);

  const selectedAggregate = useMemo(
    () => basinQuarterAggregates.find((x) => x.basinId === selectedBasinId && x.quarter === selectedQuarter) || null,
    [basinQuarterAggregates, selectedBasinId, selectedQuarter]
  );
  const selectedBasinCapturedSeries = useMemo(() => {
    const recs = certificationData?.records || [];
    const grouped = new Map();
    for (const r of recs) {
      if (String(r?.basinId) !== String(selectedBasinId)) continue;
      if (r?.type !== 'captado') continue;
      if (!Number.isFinite(r?.pulses)) continue;
      const wk = weekStartIso(r.timestamp || r.createdAt);
      if (!wk) continue;
      if (!grouped.has(wk)) grouped.set(wk, 0);
      grouped.set(wk, grouped.get(wk) + r.pulses / 100);
    }
    return [...grouped.entries()]
      .map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [certificationData, selectedBasinId]);
  const selectedAggregateApproval = approvedIssuanceBasis[`${selectedBasinId}::${selectedQuarter}`] || null;

  const totalIssued = useMemo(() => issuances.reduce((sum, x) => sum + x.quantity, 0), [issuances]);
  const totalRetired = useMemo(() => retirements.reduce((sum, x) => sum + x.quantity, 0), [retirements]);
  const availableBalance = Math.max(0, totalIssued - totalRetired);

  function selectSchoolProjectBySchoolId(schoolId) {
    const school = schools.find((s) => s.schoolId === schoolId);
    if (!school) return;
    const project = projects.find((p) => (p.linkedDeviceIds || []).includes(school?.meter?.deviceId));
    if (project) {
      setSelectedProjectId(project.projectId);
      addTimeline(`Selected ${school.schoolName} from map/dossier controls.`);
    }
  }

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
      projectTypeLabel: SCHOOL_PROJECT_TYPE_LABEL,
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
    setNewProject({ projectName: '', projectType: SCHOOL_PROJECT_TYPE, basinId: '', lat: '', lon: '' });
    addTimeline(`Created project ${id} (${created.projectName}).`);
    recordAudit({ type: 'project_created', projectId: id, projectName: created.projectName });
  }

  function runAiReviewRecommendation(_project) {
    const recommendation = 'VWBA.RWH.01';
    const missing = selectedProject?.evidenceFiles?.length ? [] : ['At least one evidence document'];
    const confidence = missing.length ? 0.66 : 0.91;
    return {
      recommendation,
      confidence,
      missing,
      summary: 'Method suggests rainwater harvesting outcomes with volumetric compliance checks for SCALL.'
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

  function approveAggregateForIssuance() {
    if (!selectedAggregate) {
      addTimeline('No basin-quarter aggregate available to approve.');
      return;
    }
    const approval = {
      basinId: selectedAggregate.basinId,
      quarter: selectedAggregate.quarter,
      approvedAt: new Date().toISOString(),
      reviewer: 'Demo Reviewer',
      methodologyVersion: METHOD_VERSION,
      usedM3: selectedAggregate.usedM3,
      eligibleM3: selectedAggregate.eligibleM3,
      schoolIds: selectedAggregate.schoolIds
    };
    const key = `${approval.basinId}::${approval.quarter}`;
    setApprovedIssuanceBasis((prev) => ({ ...prev, [key]: approval }));
    addTimeline(
      `Approved aggregate ${approval.basinId} ${approval.quarter}: ${fmt(approval.usedM3)} m³ measured, ${fmt(approval.eligibleM3)} m³ eligible.`
    );
    recordAudit({
      type: 'aggregate_certification_approved',
      ...approval
    });
  }

  function issueWbt() {
    if (!selectedProject) return;
    const review = reviews[selectedProject.projectId];
    if (!review || review.decision !== 'approve') {
      addTimeline(`Issuance blocked for ${selectedProject.projectId}: project review approval required.`);
      return;
    }
    const key = `${selectedBasinId}::${selectedQuarter}`;
    const approval = approvedIssuanceBasis[key];
    if (!approval) {
      addTimeline(`Issuance blocked: basin-quarter ${selectedBasinId || 'N/A'} ${selectedQuarter} is not approved.`);
      return;
    }

    const eligibleVolume = Number(approval.eligibleM3 || 0);
    const quantity = Math.max(1, Math.floor(eligibleVolume));

    const batch = {
      issuanceId: `ISS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      projectId: selectedProject.projectId,
      projectName: selectedProject.projectName,
      basinId: approval.basinId,
      quarter: approval.quarter,
      contributingSchools: approval.schoolIds,
      measuredVolumeM3: approval.usedM3,
      quantity,
      eligibleVolume,
      methodologyVersion: METHOD_VERSION,
      reviewer: approval.reviewer,
      period: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString()
    };

    setIssuances((x) => [batch, ...x]);
    addTimeline(`Issued ${quantity} WBT from basin ${batch.basinId} ${batch.quarter} aggregate.`);
    recordAudit({
      type: 'issuance_created',
      issuanceId: batch.issuanceId,
      projectId: batch.projectId,
      basinId: batch.basinId,
      quarter: batch.quarter,
      quantity: batch.quantity,
      reviewer: batch.reviewer,
      methodologyVersion: batch.methodologyVersion
    });
  }

  async function runSimulation() {
    if (!selectedProject) return;
    setSimBusy(true);
    try {
      const monthKey = monthKeyFromDate();
      const monthlyIndexRaw = Number(selectedRainProfile?.monthlySeasonalityIndex?.[monthKey] || 1);
      const monthlyIndex = Number.isFinite(monthlyIndexRaw) ? monthlyIndexRaw : 1;
      const seasonalMultiplier = Math.min(3.5, Math.max(0.4, monthlyIndex));
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          schoolId: selectedProject.projectId,
          deviceId: selectedProject.linkedDeviceIds[0],
          currentReadingM3: selectedSchool?.meter?.latestReadingM3 || 0,
          points: 4,
          stepM3: Number((1.2 * seasonalMultiplier).toFixed(2)),
          seasonal: {
            source: rainSeasonality?.source?.provider || 'NASA POWER',
            month: monthKey,
            monthlyIndex: Number(monthlyIndex.toFixed(3))
          },
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
      if (certificationSourceMode === 'api') {
        try {
          await loadCertificationFromApi();
        } catch (error) {
          setCertificationError(error.message || 'Failed to refresh certification from API.');
        }
      }
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
      basinId: sourceIssuance?.basinId || selectedProject?.location?.basinId || 'N/A',
      quarter: sourceIssuance?.quarter || selectedQuarter,
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
      basinId: retirement.basinId,
      quarter: retirement.quarter,
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
        <div className="kpi projects">
          <span className="kpiIconWrap">
            <KpiIcon icon="projects" />
          </span>
          <div className="label">Projects</div>
          <div className="value">{projects.length}</div>
        </div>
        <div className="kpi issued">
          <span className="kpiIconWrap">
            <KpiIcon icon="issued" />
          </span>
          <div className="label">Total Issued WBT</div>
          <div className="value">{fmt(totalIssued)}</div>
        </div>
        <div className="kpi retired">
          <span className="kpiIconWrap">
            <KpiIcon icon="retired" />
          </span>
          <div className="label">Total Retired WBT</div>
          <div className="value">{fmt(totalRetired)}</div>
        </div>
        <div className="kpi balance">
          <span className="kpiIconWrap">
            <KpiIcon icon="balance" />
          </span>
          <div className="label">Available Balance</div>
          <div className="value">{fmt(availableBalance)}</div>
        </div>
        <div className="kpi records">
          <span className="kpiIconWrap">
            <KpiIcon icon="records" />
          </span>
          <div className="label">Meter Records Ingested</div>
          <div className="value">{apiDownload?.records?.length || 0}</div>
        </div>
      </section>

      <section className="stepperWrap card">
        <div className="stepper">
          {steps.map((step) => (
            <button
              key={step.id}
              className={`stepChip ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'done' : ''}`}
              onClick={() => setCurrentStep(step.id)}
            >
              <span>{step.id}</span>
              {step.title}
            </button>
          ))}
        </div>
        <div className="row">
          <button className="secondary" disabled={currentStep === 1} onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}>
            Previous
          </button>
          <button disabled={currentStep === steps.length} onClick={() => setCurrentStep((s) => Math.min(steps.length, s + 1))}>
            Next
          </button>
        </div>
      </section>
      <section className="card statusBoard">
        <h3>Live Status Cues</h3>
        <div className="row">
          <StatusPill {...statusMeta(selectedProject?.status || 'draft')} />
          <StatusPill {...meterMeta(selectedSchool?.meter?.status || 'unknown')} />
          <StatusPill {...reviewMeta(reviews[selectedProject?.projectId || '']?.decision)} />
          <StatusPill
            tone={selectedAggregateApproval ? 'good' : 'warn'}
            icon={selectedAggregateApproval ? 'check' : 'clock'}
            label={
              selectedAggregateApproval
                ? `Aggregate Approved (${selectedBasinId || 'N/A'} ${selectedQuarter})`
                : `Aggregate Pending (${selectedBasinId || 'N/A'} ${selectedQuarter})`
            }
          />
        </div>
      </section>

      {currentStep === 1 ? (
        <section className="wizardScreen">
          <div className="card">
            <h2>1) Project Onboarding</h2>
            <p className="subtitle">All schools use project type: {SCHOOL_PROJECT_TYPE_LABEL}.</p>
            <div className="row">
              <input
                value={newProject.projectName}
                placeholder="Project name"
                onChange={(e) => setNewProject((x) => ({ ...x, projectName: e.target.value }))}
              />
              <select value={newProject.projectType} onChange={(e) => setNewProject((x) => ({ ...x, projectType: e.target.value }))}>
                <option value={SCHOOL_PROJECT_TYPE}>{SCHOOL_PROJECT_TYPE_LABEL}</option>
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
                <div key={p.projectId} className={`item stateItem ${statusMeta(p.status).tone}`}>
                  <strong>{p.projectId}</strong> · {p.projectName}
                  <div>
                    <StatusPill {...statusMeta(p.status)} />{' '}
                    <span className="badge info">{p.projectTypeLabel || SCHOOL_PROJECT_TYPE_LABEL}</span>{' '}
                    <span className="badge info">{p.location?.basinId}</span>
                  </div>
                  <button className="secondary" onClick={() => setSelectedProjectId(p.projectId)}>
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {currentStep === 2 ? (
        <section className="wizardScreen">
          <div className="card">
            <h2>2) Basin vs School Localization</h2>
            <div className="row">
              <select
                value={selectedSchool?.schoolId || ''}
                onChange={(e) => selectSchoolProjectBySchoolId(e.target.value)}
              >
                <option value="" disabled>
                  Select school
                </option>
                {schools.map((s) => (
                  <option key={s.schoolId} value={s.schoolId}>
                    {s.schoolName} ({s.schoolId})
                  </option>
                ))}
              </select>
            </div>
            {basinError ? (
              <div className="code">{basinError}</div>
            ) : (
              <RealMapClient
                schools={schools}
                basins={basins}
                selectedDeviceId={selectedProject?.linkedDeviceIds?.[0] || null}
                onSelectSchool={(school) => selectSchoolProjectBySchoolId(school.schoolId)}
              />
            )}
            <p>
              Basins shown: {(basins.features || []).length}. Schools mapped: {schools.filter((s) => typeof s.lat === 'number').length}. Source:{' '}
              <span className="badge good">HydroBASINS (real only)</span>
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
                    Rain {selectedTechnical.precipitation?.latestYear || 'N/A'}: {fmt(selectedTechnical.precipitation?.latestYearTotalMm || 0)} mm
                  </span>
                </div>
                <p>
                  Precipitation station: {selectedTechnical.precipitation?.stationLat ?? 'N/A'}, {selectedTechnical.precipitation?.stationLon ?? 'N/A'} ·
                  Peak cumulative day value: {fmt(selectedTechnical.precipitation?.maxDailyMm || 0)} mm
                </p>
                <div className="list" style={{ maxHeight: 210 }}>
                  {(selectedTechnical.reportFiles || []).map((file) => (
                    <div className="item" key={file.path}>
                      <strong>{file.name}</strong>
                      <div className="row" style={{ marginTop: 6 }}>
                        <a href={`/api/dossier-file?path=${encodeURIComponent(file.path)}`} target="_blank" rel="noreferrer">
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                  {selectedTechnical.precipitation?.sourceFile ? (
                    <div className="item">
                      <strong>Precipitation CSV</strong>
                      <div className="row" style={{ marginTop: 6 }}>
                        <a
                          href={`/api/dossier-file?path=${encodeURIComponent(selectedTechnical.precipitation.sourceFile)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  ) : null}
                  {(selectedTechnical.photoSamples || []).map((photoPath) => (
                    <div className="item" key={photoPath}>
                      <strong>{photoPath.split('/').pop()}</strong>
                      <div className="row" style={{ marginTop: 6 }}>
                        <a href={`/api/dossier-file?path=${encodeURIComponent(photoPath)}`} target="_blank" rel="noreferrer">
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      ) : null}

      {currentStep === 3 ? (
        <section className="wizardScreen">
          <div className="card">
            <h2>3) Meter Ingestion + Existing API Replay</h2>
            <p>
              Selected project: <strong>{selectedProject?.projectId || 'None'}</strong>
              {selectedSchool ? (
                <>
                  {' '}
                  · device <strong>{selectedSchool.meter.deviceId}</strong> · current reading <strong>{fmt(selectedSchool.meter.latestReadingM3)} m³</strong>
                </>
              ) : null}
            </p>
            <div className="row">
              <button disabled={!selectedProject || simBusy} onClick={runSimulation}>
                {simBusy ? 'Simulating...' : 'Simulate + send to APIs'}
              </button>
              <StatusPill {...meterMeta(selectedSchool?.meter?.status || 'unknown')} />
            </div>
            <p>
              Seasonal rain multiplier (month {monthKeyFromDate()}):{' '}
              <strong>{fmt(selectedRainProfile?.monthlySeasonalityIndex?.[monthKeyFromDate()] || 1)}x</strong>{' '}
              {rainSeasonality?.source?.provider ? (
                <span className="badge info">
                  Source {rainSeasonality.source.provider} ({rainSeasonality.source.parameter || 'PRECTOTCORR'})
                </span>
              ) : null}
            </p>
            {rainSeasonality?.source?.docs ? (
              <p>
                Rain data docs:{' '}
                <a href={rainSeasonality.source.docs} target="_blank" rel="noreferrer">
                  {rainSeasonality.source.docs}
                </a>
              </p>
            ) : null}
            {rainLoadError ? <div className="code">{rainLoadError}</div> : null}
            <div className="code">{JSON.stringify(apiDownload?.records?.slice(0, 8) || [], null, 2)}</div>
          </div>
        </section>
      ) : null}

      {currentStep === 4 ? (
        <section className="wizardScreen">
          <div className="card">
            <h2>4) Certification Review Workspace</h2>
            <h3>VWBO Data Source</h3>
            <p>Choose whether VWBO certification uses live API data or an uploaded `/api/download`-format JSON file.</p>
            <div className="row">
              <button
                className={certificationSourceMode === 'api' ? '' : 'secondary'}
                onClick={async () => {
                  try {
                    await loadCertificationFromApi();
                  } catch (error) {
                    setCertificationError(error.message || 'Failed to load API data source.');
                  }
                }}
              >
                Use API Source
              </button>
              <label className="uploadLabel">
                Upload Download JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await processCertificationUpload(file);
                    } catch (error) {
                      setCertificationError(error.message || 'Uploaded JSON could not be processed.');
                    } finally {
                      e.target.value = '';
                    }
                  }}
                />
              </label>
              <span className="badge info">
                Active source: {certificationSourceMode === 'api' ? 'API' : `Upload (${certificationUploadName || 'file'})`}
              </span>
            </div>
            <h3>SSCAP Pipeline (Colab-aligned)</h3>
            <p>
              1) Read SSCAP API data 2) Remove duplicates 3) Map <code>tlaloque_id</code> to basin from school latitude/longitude
              4) Aggregate by basin + quarter 5) Human review.
            </p>
            <div className="row">
              <span className="badge info">Fetched: {certificationData?.pipeline?.fetched || 0}</span>
              <span className="badge warn">Duplicates removed: {certificationData?.pipeline?.duplicatesRemoved || 0}</span>
              <span className="badge info">Deduped: {certificationData?.pipeline?.deduplicated || 0}</span>
              <span className="badge info">Mapped to basins: {certificationData?.pipeline?.mappedToBasins || 0}</span>
            </div>
            {certificationData?.sources?.length ? (
              <p>
                Sources:{' '}
                {certificationData.sources
                  .map((s) => `${s.name} (${s.fetched}${s.error ? `, ${s.error}` : ''})`)
                  .join(' · ')}
              </p>
            ) : null}
            {certificationError ? <div className="code">{certificationError}</div> : null}
            <div className="chartGrid">
              <MiniBarChart title="Basin Totals (Used m³)" data={basinTotals} labelKey="basinId" valueKey="usedM3" unit="m³" />
              <MiniBarChart
                title={`Quarterly Used m³ (${selectedBasinId || 'No Basin'})`}
                data={basinQuarterAggregates.filter((x) => x.basinId === selectedBasinId)}
                labelKey="quarter"
                valueKey="usedM3"
                unit="m³"
              />
              <MiniLineChart
                title={`Captured Water Over Time (${selectedBasinId || 'No Basin'})`}
                points={selectedBasinCapturedSeries}
                unit="m³/week"
              />
            </div>
            <p>
              AI recommendation: <strong>{aiForSelected?.recommendation || 'N/A'}</strong> · confidence {fmt((aiForSelected?.confidence || 0) * 100)}%
            </p>
            <p>{aiForSelected?.summary}</p>
            <div className="row">
              <StatusPill {...reviewMeta(reviews[selectedProject?.projectId || '']?.decision)} />
            </div>
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
            <h3 style={{ marginTop: 20 }}>Basin + Quarter Aggregation (for issuance)</h3>
            <p>
              Certification now aggregates measured <code>utilizado</code> volume by basin and quarter before issuance.
            </p>
            <div className="row">
              <select value={selectedBasinId} onChange={(e) => setSelectedBasinId(e.target.value)}>
                {basinOptions.length === 0 ? <option value="">No basin data yet</option> : null}
                {basinOptions.map((basinId) => (
                  <option key={basinId} value={basinId}>
                    {basinId}
                  </option>
                ))}
              </select>
              <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)}>
                {QUARTERS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <button disabled={!selectedAggregate} onClick={approveAggregateForIssuance}>
                Approve basin-quarter aggregate
              </button>
            </div>
            {selectedAggregate ? (
              <div className="row">
                <span className="badge info">Measured: {fmt(selectedAggregate.usedM3)} m³</span>
                <span className="badge good">Eligible: {fmt(selectedAggregate.eligibleM3)} m³</span>
                <span className="badge info">Records: {selectedAggregate.records || 0}</span>
                <span className="badge info">Schools: {selectedAggregate.schoolIds?.length || 0}</span>
              </div>
            ) : (
              <p>No ingested `utilizado` records available for this basin/quarter yet.</p>
            )}
            {approvedIssuanceBasis[`${selectedBasinId}::${selectedQuarter}`] ? (
              <p>
                <StatusPill tone="good" icon="check" label="Aggregate Approved for Issuance" />
              </p>
            ) : null}
            <div className="code">{JSON.stringify(selectedProject ? reviews[selectedProject.projectId] || {} : {}, null, 2)}</div>
          </div>
        </section>
      ) : null}

      {currentStep === 5 ? (
        <section className="wizardScreen">
          <div className="card">
            <h2>5) VWB Eligibility / WBT Issuance</h2>
            <p>
              Issuance is approval-gated and uses certified basin-quarter aggregate volume:
              <code>eligibleVolume = aggregatedUtilizadoM3 * 0.85</code>; <code>WBT quantity = floor(eligibleVolume)</code>.
            </p>
            <div className="row">
              <span className="badge info">Basin: {selectedBasinId || 'N/A'}</span>
              <span className="badge info">Quarter: {selectedQuarter}</span>
              {selectedAggregate ? (
                <>
                  <span className="badge info">Measured: {fmt(selectedAggregate.usedM3)} m³</span>
                  <span className="badge good">Eligible: {fmt(selectedAggregate.eligibleM3)} m³</span>
                </>
              ) : null}
            </div>
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
                  <div className="item stateItem good" key={x.issuanceId}>
                    <strong>{x.issuanceId}</strong> · {x.projectId} · basin {x.basinId} · {x.quarter} · {fmt(x.quantity)} WBT · reviewer {x.reviewer}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      {currentStep === 6 ? (
        <section className="wizardScreen">
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
                  <div className="item stateItem info" key={r.retirementId}>
                    <strong>{r.retirementId}</strong> · {r.buyer} · {fmt(r.quantity)} WBT retired
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      {currentStep === 7 ? (
        <section className="wizardScreen">
          <div className="card">
            <h2>7) Certificate + Report Output</h2>
            <p>
              Generated immediately at retirement and persisted via <code>/api/reports</code>.
            </p>
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
      ) : null}
    </main>
  );
}
