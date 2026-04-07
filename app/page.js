'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const BUYERS = [
  { id: 'buyer-1', name: 'Acme Manufacturing', approved: true, role: 'buyer' },
  { id: 'buyer-2', name: 'Pending Buyer LLC', approved: false, role: 'buyer' }
];

const METHOD_VERSION = 'VWBA-0.9-demo';
const SCHOOL_PROJECT_TYPE = 'captacion_agua_de_lluvia_scall';
const SCHOOL_PROJECT_TYPE_LABEL = 'Captación de agua de lluvia (SCALL)';
const PROJECT_TYPES = [
  { value: 'captacion_agua_de_lluvia_scall', label: 'Captación de agua de lluvia (SCALL)' },
  { value: 'desalination_water_treatment', label: 'Desalination / Water Treatment' },
  { value: 'leak_reduction_efficiency', label: 'Leak Reduction / Efficiency' }
];

const steps = [
  { id: 1, title: 'Admin' },
  { id: 2, title: 'Certification' },
  { id: 3, title: 'Blockchain' },
  { id: 4, title: 'Marketplace' },
  { id: 5, title: 'Customer Account' },
  { id: 6, title: 'Map' }
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
        <path d={path} fill="none" stroke="#192dd8" strokeWidth="2.5" />
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
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [reviews, setReviews] = useState({});
  const [issuances, setIssuances] = useState([]);
  const [retirements, setRetirements] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState(BUYERS[0].id);
  const [selectedIssuanceId, setSelectedIssuanceId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('10');
  const [retireQty, setRetireQty] = useState('10');
  const [retirePurpose, setRetirePurpose] = useState('Demo day retirement claim');
  const [purchases, setPurchases] = useState([]);
  const [marketFilterBasin, setMarketFilterBasin] = useState('');
  const [marketFilterType, setMarketFilterType] = useState('');
  const [marketFilterPromoter, setMarketFilterPromoter] = useState('');
  const [newProject, setNewProject] = useState({
    projectName: '',
    promoter: '',
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
  const [chartBasins, setChartBasins] = useState([]);
  const [rainSeasonality, setRainSeasonality] = useState({ source: null, schools: {} });
  const [rainLoadError, setRainLoadError] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState(quarterFromDate());
  const [selectedBasinId, setSelectedBasinId] = useState('');
  const [approvedIssuanceBasis, setApprovedIssuanceBasis] = useState({});
  const [lastReport, setLastReport] = useState(null);
  const [basinError, setBasinError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [reviewComment, setReviewComment] = useState('');
  const [projectDetailTab, setProjectDetailTab] = useState('overview');

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
    return processCertificationPayload(parsed, `upload:${file.name}`, file.name);
  }

  async function processCertificationPayload(payload, sourceName, uploadName = '') {
    const response = await fetch('/api/certification', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceName, downloadPayload: payload })
    });
    const data = await response.json();
    if (!response.ok || data?.error) {
      throw new Error(data?.error || 'Uploaded JSON could not be processed.');
    }
    setCertificationData(data);
    setCertificationError('');
    setCertificationSourceMode('upload');
    setCertificationUploadName(uploadName || sourceName || 'uploaded');
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
      setSelectedSchoolId(schoolsData[0]?.schoolId || '');
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
    if (selectedSchoolId) {
      const byId = schools.find((s) => s.schoolId === selectedSchoolId);
      if (byId) return byId;
    }
    if (!selectedProject) return null;
    const device = selectedProject.linkedDeviceIds?.[0];
    return schools.find((s) => s.meter?.deviceId === device) || null;
  }, [selectedProject, schools, selectedSchoolId]);

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

  const certificationBasinOptions = useMemo(() => {
    const values = new Set();
    basinTotals.forEach((x) => values.add(String(x.basinId)));
    basinQuarterAggregates.forEach((x) => values.add(String(x.basinId)));
    return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [basinTotals, basinQuarterAggregates]);

  const basinOptions = useMemo(() => {
    const values = new Set();
    certificationBasinOptions.forEach((b) => values.add(b));
    if (!values.size) {
      schools.forEach((s) => values.add(String(s.basinId)));
    }
    return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [certificationBasinOptions, schools]);

  useEffect(() => {
    if (!basinOptions.length) return;
    if (!selectedBasinId || !basinOptions.some((b) => String(b) === String(selectedBasinId))) {
      setSelectedBasinId(String(basinOptions[0]));
    }
  }, [basinOptions, selectedBasinId]);

  useEffect(() => {
    // If certification data is loaded, prefer a basin that actually exists in certification aggregates.
    if (!certificationBasinOptions.length) return;
    if (!certificationBasinOptions.some((b) => String(b) === String(selectedBasinId))) {
      setSelectedBasinId(certificationBasinOptions[0]);
    }
  }, [certificationBasinOptions, selectedBasinId]);

  useEffect(() => {
    if (!certificationBasinOptions.length) {
      setChartBasins([]);
      return;
    }
    setChartBasins((prev) => {
      const validPrev = prev.filter((b) => certificationBasinOptions.includes(String(b)));
      if (validPrev.length) return validPrev;
      return [...certificationBasinOptions];
    });
  }, [certificationBasinOptions]);

  const selectedAggregate = useMemo(
    () => basinQuarterAggregates.find((x) => x.basinId === selectedBasinId && x.quarter === selectedQuarter) || null,
    [basinQuarterAggregates, selectedBasinId, selectedQuarter]
  );
  const basinCapturedSeriesMap = useMemo(() => {
    const recs = certificationData?.records || [];
    const map = new Map();
    for (const r of recs) {
      const basin = String(r?.basinId || '');
      if (!basin || r?.type !== 'captado' || !Number.isFinite(r?.pulses)) continue;
      const wk = weekStartIso(r.timestamp || r.createdAt);
      if (!wk) continue;
      if (!map.has(basin)) map.set(basin, new Map());
      const byWeek = map.get(basin);
      if (!byWeek.has(wk)) byWeek.set(wk, 0);
      byWeek.set(wk, byWeek.get(wk) + r.pulses / 100);
    }
    const out = {};
    for (const [basin, byWeek] of map.entries()) {
      out[basin] = [...byWeek.entries()]
        .map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return out;
  }, [certificationData]);
  const selectedChartBasins = useMemo(
    () => chartBasins.filter((b) => certificationBasinOptions.includes(String(b))),
    [chartBasins, certificationBasinOptions]
  );
  const quarterlyChartData = useMemo(() => {
    return selectedChartBasins.map((basinId) => ({
      basinId,
      points: basinQuarterAggregates.filter((x) => String(x.basinId) === String(basinId))
    }));
  }, [selectedChartBasins, basinQuarterAggregates]);
  const selectedAggregateApproval = approvedIssuanceBasis[`${selectedBasinId}::${selectedQuarter}`] || null;
  const currentStepMeta = steps.find((s) => s.id === currentStep) || steps[0];
  const stepProgressPct = Math.round((currentStep / steps.length) * 100);
  const workflowStatus = useMemo(
    () => [
      { label: 'Admin', done: projects.length > 0 && (apiDownload?.records?.length || 0) > 0 },
      { label: 'Certification', done: Object.keys(approvedIssuanceBasis || {}).length > 0 },
      { label: 'Blockchain', done: issuances.length > 0 },
      { label: 'Marketplace', done: purchases.length > 0 },
      { label: 'Customer Account', done: retirements.length > 0 && Boolean(lastReport) },
      { label: 'Map', done: (basins?.features?.length || 0) > 0 && Boolean(selectedSchool) }
    ],
    [projects.length, basins, selectedSchool, apiDownload, approvedIssuanceBasis, issuances.length, purchases.length, retirements.length, lastReport]
  );

  const totalIssued = useMemo(() => issuances.reduce((sum, x) => sum + x.quantity, 0), [issuances]);
  const totalPurchased = useMemo(() => purchases.reduce((sum, x) => sum + x.quantity, 0), [purchases]);
  const totalRetired = useMemo(() => retirements.reduce((sum, x) => sum + x.quantity, 0), [retirements]);
  const availableBalance = Math.max(0, totalIssued - totalRetired);
  const purchasedByIssuance = useMemo(() => {
    const map = new Map();
    for (const p of purchases) {
      map.set(p.issuanceId, (map.get(p.issuanceId) || 0) + p.quantity);
    }
    return map;
  }, [purchases]);
  const inventoryRows = useMemo(() => {
    return issuances.map((x) => {
      const purchased = purchasedByIssuance.get(x.issuanceId) || 0;
      const availableToBuy = Math.max(0, x.quantity - purchased);
      const project = projects.find((p) => p.projectId === x.projectId);
      return {
        ...x,
        purchased,
        availableToBuy,
        promoter: project?.promoter || project?.operator || 'Unknown',
        projectType: project?.projectType || '',
        projectTypeLabel: project?.projectTypeLabel || ''
      };
    });
  }, [issuances, purchasedByIssuance, projects]);
  const filteredInventory = useMemo(() => {
    return inventoryRows.filter((x) => {
      if (marketFilterBasin && String(x.basinId) !== String(marketFilterBasin)) return false;
      if (marketFilterType && String(x.projectType) !== String(marketFilterType)) return false;
      if (marketFilterPromoter && !String(x.promoter || '').toLowerCase().includes(marketFilterPromoter.toLowerCase())) return false;
      return true;
    });
  }, [inventoryRows, marketFilterBasin, marketFilterType, marketFilterPromoter]);
  const buyerPurchases = useMemo(() => purchases.filter((p) => p.buyerId === selectedBuyerId), [purchases, selectedBuyerId]);
  const buyerRetired = useMemo(
    () => retirements.filter((r) => r.buyerId === selectedBuyerId).reduce((sum, r) => sum + r.quantity, 0),
    [retirements, selectedBuyerId]
  );
  const buyerPurchased = useMemo(() => buyerPurchases.reduce((sum, p) => sum + p.quantity, 0), [buyerPurchases]);
  const buyerAvailableBalance = Math.max(0, buyerPurchased - buyerRetired);

  function selectSchoolProjectBySchoolId(schoolId) {
    const school = schools.find((s) => s.schoolId === schoolId);
    if (!school) return;
    setSelectedSchoolId(schoolId);
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
    const projectTypeLabel = PROJECT_TYPES.find((x) => x.value === newProject.projectType)?.label || newProject.projectType;
    const created = {
      projectId: id,
      projectName: newProject.projectName,
      promoter: newProject.promoter || 'Unspecified promoter',
      projectType: newProject.projectType,
      projectTypeLabel,
      projectScope: 'single_site_complex_project',
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
      linkedSchoolIds: [],
      siteCount: 1,
      evidenceFiles: [],
      certificationReviewer: 'Pending assignment',
      methodologyStatus: 'draft',
      notes: 'Created during demo.'
    };
    setProjects((p) => [created, ...p]);
    setSelectedProjectId(id);
    setNewProject({ projectName: '', promoter: '', projectType: SCHOOL_PROJECT_TYPE, basinId: '', lat: '', lon: '' });
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
      comments: reviewComment || '',
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
    setReviewComment('');
    recordAudit({
      type: 'review_decision',
      projectId: selectedProject.projectId,
      reviewer: review.reviewer,
      decision,
      comments: review.comments,
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
    setSelectedIssuanceId((prev) => prev || batch.issuanceId);
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

  function purchaseWbtFromBatch() {
    const buyer = BUYERS.find((b) => b.id === selectedBuyerId);
    const qty = Number(purchaseQty);
    const batch = filteredInventory.find((x) => x.issuanceId === selectedIssuanceId) || inventoryRows.find((x) => x.issuanceId === selectedIssuanceId);
    if (!buyer?.approved || !batch || !qty || qty <= 0 || qty > batch.availableToBuy) {
      addTimeline('Purchase blocked: buyer approval, batch selection, or quantity constraints not satisfied.');
      return;
    }

    const purchase = {
      purchaseId: `BUY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      buyerId: buyer.id,
      buyer: buyer.name,
      issuanceId: batch.issuanceId,
      projectId: batch.projectId,
      basinId: batch.basinId,
      quantity: qty,
      at: new Date().toISOString()
    };
    setPurchases((prev) => [purchase, ...prev]);
    addTimeline(`${buyer.name} purchased ${qty} WBT from ${batch.issuanceId}.`);
    recordAudit({
      type: 'purchase_created',
      purchaseId: purchase.purchaseId,
      buyer: purchase.buyer,
      issuanceId: purchase.issuanceId,
      quantity: purchase.quantity
    });
  }

  async function runSimulation() {
    if (!selectedProject) return;
    setSimBusy(true);
    try {
      const targetDeviceId = selectedSchool?.meter?.deviceId || selectedProject.linkedDeviceIds?.[0];
      const targetSchoolId = selectedSchool?.schoolId || selectedProject.projectId;
      if (!targetDeviceId) {
        addTimeline('Simulation blocked: no target device found.');
        return;
      }
      const monthKey = monthKeyFromDate();
      const monthlyIndexRaw = Number(selectedRainProfile?.monthlySeasonalityIndex?.[monthKey] || 1);
      const monthlyIndex = Number.isFinite(monthlyIndexRaw) ? monthlyIndexRaw : 1;
      const seasonalMultiplier = Math.min(3.5, Math.max(0.4, monthlyIndex));
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          schoolId: targetSchoolId,
          deviceId: targetDeviceId,
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
            s.meter?.deviceId === targetDeviceId
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
    if (!buyer?.approved || !qty || qty <= 0 || qty > buyerAvailableBalance) {
      addTimeline('Retirement blocked: buyer approval/balance constraints not satisfied.');
      return;
    }

    const sourcePurchase = buyerPurchases[0];
    const sourceIssuance = issuances.find((x) => x.issuanceId === sourcePurchase?.issuanceId) || issuances[0];
    const retirement = {
      retirementId: `RET-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      buyerId: buyer.id,
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
  const selectedProjectReview = selectedProject ? reviews[selectedProject.projectId] || null : null;
  const selectedProjectIssuances = useMemo(
    () => (selectedProject ? issuances.filter((x) => x.projectId === selectedProject.projectId) : []),
    [issuances, selectedProject]
  );

  return (
    <main className="page">
      <section className="header">
        <div className="brandIntro">
          <a className="brandLogoLink" href="https://bluelifeline.org/" target="_blank" rel="noreferrer" aria-label="Blue Lifeline website">
            <Image
              src="/brand/bluelifeline-logo-wordmark.png"
              alt="Blue Lifeline"
              width={220}
              height={38}
              className="brandLogo"
              priority
            />
          </a>
          <h1 className="title">Blue Lifeline MVP Modules Console</h1>
          <p className="subtitle">
            Refactored to 6 MVP modules from the latest spec: Admin, Certification, Blockchain, Marketplace, Customer Account,
            and Map. Includes school dataset, SSCAP ingestion/replay, issuance, retirement, and audit-ready reporting.
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
        <div className="stepNow">
          <strong>
            Step {currentStep} of {steps.length}: {currentStepMeta.title}
          </strong>
          <span className="badge info">{stepProgressPct}%</span>
        </div>
        <div className="stepProgress">
          <div className="stepProgressFill" style={{ width: `${stepProgressPct}%` }} />
        </div>
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
        <div className="workflowStrip">
          {workflowStatus.map((s) => (
            <span key={s.label} className={`workflowItem ${s.done ? 'done' : 'pending'}`}>
              {s.label}
            </span>
          ))}
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
            <p className="subtitle">Project model supports multi-type onboarding; current school seeds remain SCALL-focused.</p>
            <div className="row">
              <input
                value={newProject.projectName}
                placeholder="Project name"
                onChange={(e) => setNewProject((x) => ({ ...x, projectName: e.target.value }))}
              />
              <input
                value={newProject.promoter}
                placeholder="Promoter / developer"
                onChange={(e) => setNewProject((x) => ({ ...x, promoter: e.target.value }))}
              />
              <select value={newProject.projectType} onChange={(e) => setNewProject((x) => ({ ...x, projectType: e.target.value }))}>
                {PROJECT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
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
                    <span className="badge info">{p.promoter || p.operator || 'No promoter'}</span>
                    <span className="badge info">{p.siteCount || 1} site(s)</span>
                  </div>
                  <button className="secondary" onClick={() => setSelectedProjectId(p.projectId)}>
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2>1b) Project Detail Snapshot</h2>
            {!selectedProject ? (
              <p>Select a project to see detail, evidence, and issuance links.</p>
            ) : (
              <>
                <div className="tabRow">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'evidence', label: 'Evidence' },
                    { id: 'certification', label: 'Certification' },
                    { id: 'issuance', label: 'Issuance' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      className={`tabChip ${projectDetailTab === tab.id ? 'active' : ''}`}
                      onClick={() => setProjectDetailTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <p>
                  <strong>{selectedProject.projectId}</strong> · {selectedProject.projectName}
                </p>
                {projectDetailTab === 'overview' ? (
                  <>
                    <div className="row">
                      <span className="badge info">Promoter: {selectedProject.promoter || selectedProject.operator || 'N/A'}</span>
                      <span className="badge info">Type: {selectedProject.projectTypeLabel || selectedProject.projectType}</span>
                      <span className="badge info">Basin: {selectedProject.location?.basinId || 'N/A'}</span>
                      <span className="badge info">Device: {selectedProject.linkedDeviceIds?.[0] || 'N/A'}</span>
                      <span className="badge info">Scope: {selectedProject.projectScope || 'single_site'}</span>
                    </div>
                    <div className="row">
                      <span className="badge info">Status: {selectedProject.status || 'N/A'}</span>
                      <span className="badge info">Method status: {selectedProject.methodologyStatus || 'N/A'}</span>
                      <span className="badge info">Reviewer: {selectedProject.certificationReviewer || 'N/A'}</span>
                      <span className="badge info">Linked schools: {selectedProject.linkedSchoolIds?.length || 0}</span>
                    </div>
                  </>
                ) : null}
                {projectDetailTab === 'evidence' ? (
                  <>
                    <div className="row">
                      <span className="badge info">Evidence files: {selectedProject.evidenceFiles?.length || 0}</span>
                      <span className="badge info">Dossier reports: {selectedTechnical?.pdfCount || 0}</span>
                      <span className="badge info">Dossier photos: {selectedTechnical?.imageCount || 0}</span>
                    </div>
                    <div className="list">
                      {(selectedTechnical?.reportFiles || []).length === 0 ? (
                        <div className="item">No dossier evidence linked to this project.</div>
                      ) : (
                        (selectedTechnical?.reportFiles || []).map((file) => (
                          <div className="item" key={file.path}>
                            <strong>{file.name}</strong>{' '}
                            <a href={`/api/dossier-file?path=${encodeURIComponent(file.path)}`} target="_blank" rel="noreferrer">
                              Download
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : null}
                {projectDetailTab === 'certification' ? (
                  <>
                    <div className="row">
                      <StatusPill {...reviewMeta(selectedProjectReview?.decision)} />
                      <span className="badge info">Method version: {selectedProjectReview?.methodologyVersion || METHOD_VERSION}</span>
                    </div>
                    <div className="code">{JSON.stringify(selectedProjectReview || { message: 'No certification review yet.' }, null, 2)}</div>
                  </>
                ) : null}
                {projectDetailTab === 'issuance' ? (
                  <div className="list">
                    {selectedProjectIssuances.length === 0 ? (
                      <div className="item">No issuance history for this project.</div>
                    ) : (
                      selectedProjectIssuances.map((x) => (
                        <div className="item" key={x.issuanceId}>
                          <strong>{x.issuanceId}</strong> · basin {x.basinId} · {x.quarter} · {fmt(x.quantity)} WBT · {x.period}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      ) : null}

      {currentStep === 6 ? (
        <section className="wizardScreen">
          <div className="card">
            <h2>6) Map Module - Basin vs School Localization</h2>
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
                selectedDeviceId={selectedSchool?.meter?.deviceId || selectedProject?.linkedDeviceIds?.[0] || null}
                onSelectSchool={(school) => selectSchoolProjectBySchoolId(school.schoolId)}
              />
            )}
            <p>
              Basins shown: {(basins.features || []).length}. Schools mapped: {schools.filter((s) => typeof s.lat === 'number').length}. Source:{' '}
              <span className="badge good">HydroBASINS (real only)</span>
            </p>
          </div>

          <div className="card">
            <h2>6b) School Technical Dossier (BL_IU_Technical)</h2>
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

      {currentStep === 1 ? (
        <section className="wizardScreen">
          <div className="card">
            <h2>1c) Meter Ingestion + Device Layer</h2>
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

      {currentStep === 2 ? (
        <section className="wizardScreen">
          <div className="card">
            <h2>2) Certification Module</h2>
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
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    const payload = await fetch('/data/sscap_2025_weekly_api_download.json').then((r) => r.json());
                    await processCertificationPayload(payload, 'hosted-demo-file', 'sscap_2025_weekly_api_download.json');
                  } catch (error) {
                    setCertificationError(error.message || 'Failed to load hosted demo file.');
                  }
                }}
              >
                Use Hosted Demo File
              </button>
              <span className="badge info">
                Active source: {certificationSourceMode === 'api' ? 'API' : `Upload (${certificationUploadName || 'file'})`}
              </span>
              <a className="badge good" href="/data/sscap_2025_weekly_api_download.json" download>
                Download Demo Upload JSON
              </a>
              <a className="badge info" href="/data/sscap_2025_weekly_summary.json" download>
                Download Demo Summary
              </a>
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
            <div className="chartSelector">
              <div className="row">
                <button
                  className="secondary"
                  onClick={() => {
                    setChartBasins([...certificationBasinOptions]);
                  }}
                >
                  Plot All Basins
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setChartBasins(selectedBasinId ? [String(selectedBasinId)] : []);
                  }}
                >
                  Plot Selected Basin
                </button>
                <button className="secondary" onClick={() => setChartBasins([])}>
                  Clear Plots
                </button>
              </div>
              <div className="basinMulti">
                {certificationBasinOptions.map((basinId) => {
                  const active = selectedChartBasins.includes(String(basinId));
                  return (
                    <button
                      key={basinId}
                      className={`basinChip ${active ? 'active' : ''}`}
                      onClick={() =>
                        setChartBasins((prev) =>
                          prev.includes(String(basinId))
                            ? prev.filter((b) => b !== String(basinId))
                            : [...prev, String(basinId)]
                        )
                      }
                    >
                      {basinId}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="chartGrid">
              <MiniBarChart title="Basin Totals (Used m³)" data={basinTotals} labelKey="basinId" valueKey="usedM3" unit="m³" />
              {quarterlyChartData.length === 0 ? (
                <MiniBarChart title="Quarterly Used m³" data={[]} labelKey="quarter" valueKey="usedM3" unit="m³" />
              ) : (
                quarterlyChartData.map((entry) => (
                  <MiniBarChart
                    key={`q-${entry.basinId}`}
                    title={`Quarterly Used m³ (${entry.basinId})`}
                    data={entry.points}
                    labelKey="quarter"
                    valueKey="usedM3"
                    unit="m³"
                  />
                ))
              )}
              {selectedChartBasins.length === 0 ? (
                <MiniLineChart title="Captured Water Over Time" points={[]} unit="m³/week" />
              ) : (
                selectedChartBasins.map((basinId) => (
                  <MiniLineChart
                    key={`c-${basinId}`}
                    title={`Captured Water Over Time (${basinId})`}
                    points={basinCapturedSeriesMap[basinId] || []}
                    unit="m³/week"
                  />
                ))
              )}
            </div>
            <p>
              AI recommendation: <strong>{aiForSelected?.recommendation || 'N/A'}</strong> · confidence {fmt((aiForSelected?.confidence || 0) * 100)}%
            </p>
            <p>{aiForSelected?.summary}</p>
            <div className="row">
              <StatusPill {...reviewMeta(reviews[selectedProject?.projectId || '']?.decision)} />
            </div>
            <p>Missing evidence: {aiForSelected?.missing?.length ? aiForSelected.missing.join(', ') : 'None'}</p>
            <textarea
              value={reviewComment}
              rows={3}
              placeholder="Reviewer comments (required in real certification)"
              onChange={(e) => setReviewComment(e.target.value)}
            />
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

      {currentStep === 3 ? (
        <section className="wizardScreen">
          <div className="card">
            <h2>3) Blockchain Module - VWB Eligibility / WBT Issuance</h2>
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

      {currentStep === 4 ? (
        <section className="wizardScreen">
          <div className="card">
            <h2>4) Marketplace Module</h2>
            <div className="row">
              <select value={selectedBuyerId} onChange={(e) => setSelectedBuyerId(e.target.value)}>
                {BUYERS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.approved ? 'approved' : 'unapproved'})
                  </option>
                ))}
              </select>
              <input value={marketFilterPromoter} onChange={(e) => setMarketFilterPromoter(e.target.value)} placeholder="Filter promoter" />
            </div>
            <div className="row">
              <select value={marketFilterBasin} onChange={(e) => setMarketFilterBasin(e.target.value)}>
                <option value="">All basins</option>
                {[...new Set(inventoryRows.map((x) => String(x.basinId)))].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select value={marketFilterType} onChange={(e) => setMarketFilterType(e.target.value)}>
                <option value="">All project types</option>
                {[...new Set(inventoryRows.map((x) => String(x.projectType)).filter(Boolean))].map((t) => (
                  <option key={t} value={t}>
                    {PROJECT_TYPES.find((x) => x.value === t)?.label || t}
                  </option>
                ))}
              </select>
              <select value={selectedIssuanceId} onChange={(e) => setSelectedIssuanceId(e.target.value)}>
                <option value="">Select issuance batch</option>
                {filteredInventory.map((x) => (
                  <option key={x.issuanceId} value={x.issuanceId}>
                    {x.issuanceId} · {x.projectId} · available {fmt(x.availableToBuy)}
                  </option>
                ))}
              </select>
              <input value={purchaseQty} onChange={(e) => setPurchaseQty(e.target.value)} placeholder="Purchase quantity" />
              <button onClick={purchaseWbtFromBatch}>Purchase WBT</button>
            </div>
            <div className="row">
              <span className="badge info">Issued total: {fmt(totalIssued)}</span>
              <span className="badge info">Purchased total: {fmt(totalPurchased)}</span>
              <span className="badge info">Buyer holdings: {fmt(buyerAvailableBalance)}</span>
            </div>
            <div className="list">
              {filteredInventory.length === 0 ? (
                <div className="item">No inventory matches current filters.</div>
              ) : (
                filteredInventory.map((x) => (
                  <div className="item stateItem info" key={x.issuanceId}>
                    <strong>{x.issuanceId}</strong> · {x.projectId} · basin {x.basinId} · {x.projectTypeLabel || x.projectType} · promoter {x.promoter} ·
                    available {fmt(x.availableToBuy)} / issued {fmt(x.quantity)}
                  </div>
                ))
              )}
            </div>
          </div>

        </section>
      ) : null}

      {currentStep === 5 ? (
        <section className="wizardScreen">
          <div className="card">
            <h2>5) Customer Account Module - Holdings + Retirement</h2>
            <div className="row">
              <select value={selectedBuyerId} onChange={(e) => setSelectedBuyerId(e.target.value)}>
                {BUYERS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.approved ? 'approved' : 'unapproved'})
                  </option>
                ))}
              </select>
              <input value={retireQty} onChange={(e) => setRetireQty(e.target.value)} placeholder="Retire quantity" />
            </div>
            <textarea value={retirePurpose} rows={3} onChange={(e) => setRetirePurpose(e.target.value)} />
            <div className="row">
              <button onClick={retireWbt}>Retire WBT</button>
              <span className="badge info">buyer available: {fmt(buyerAvailableBalance)} WBT</span>
            </div>
            <div className="list">
              {buyerPurchases.length === 0 ? (
                <div className="item">No purchases for selected buyer yet.</div>
              ) : (
                buyerPurchases.map((p) => (
                  <div className="item" key={p.purchaseId}>
                    <strong>{p.purchaseId}</strong> · {p.issuanceId} · {fmt(p.quantity)} WBT
                  </div>
                ))
              )}
            </div>
            <div className="list" style={{ marginTop: 10 }}>
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
          <div className="card">
            <h2>5b) Certificate + Report Output</h2>
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
