import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../context/store';
import { getHospitalStaffEntries } from '../utils/hospitalDirectory';
import { normalizeRole } from '../utils/roles';
import Exercise3DCard from '../components/Exercise3DCard';
import Footer from '../components/Footer';
import './Home.css';

const DASHBOARD_PATHS = {
  patient: '/patient-dashboard',
  attendant: '/attendant-dashboard',
  doctor: '/doctor-dashboard',
  reception: '/reception-dashboard',
  admin: '/admin-dashboard',
  'super-admin': '/super-admin-dashboard',
};

const PRIORITY_MULTIPLIER = {
  routine: 1,
  priority: 0.75,
  emergency: 0.55,
};

const PRIORITY_LABELS = {
  routine: 'Routine',
  priority: 'Priority',
  emergency: 'Emergency',
};

const HOME_ACTIVITY_IMAGES = [
  {
    id: 'reception-checkin',
    title: 'Reception Check-In',
    description: 'Complete your check-in and get your queue token at reception.',
    imageUrl:
      'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'doctor-consultation',
    title: 'Doctor Consultation',
    description: 'Meet your doctor for diagnosis, advice, and treatment planning.',
    imageUrl:
      'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'patient-care',
    title: 'Patient Care Activity',
    description: 'Get guided support from staff through each step of your visit.',
    imageUrl:
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
  },
];

const HOME_ACTIVITY_VIDEOS = [
  {
    id: 'queue-demo',
    title: 'Queue Journey',
    description: 'See how your queue moves from waiting to consultation.',
    videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
    poster:
      'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'consultation-demo',
    title: 'Doctor Visit Journey',
    description: 'See how consultation and follow-up happen step by step.',
    videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-10s.mp4',
    poster:
      'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=80',
  },
];

const FIVE_MINUTE_TOUR_STOPS = [
  {
    id: 'tour-wait-planner',
    title: 'Try Wait Planner',
    description: 'Estimate your visit timing and smart check-in window.',
    targetId: 'tools',
  },
  {
    id: 'tour-discovery',
    title: 'Discover Doctors',
    description: 'Filter by hospital and department to compare specialists.',
    targetId: 'tools',
  },
  {
    id: 'tour-visuals',
    title: 'Explore Care Visuals',
    description: 'Browse real care activity images and clips.',
    targetId: 'images',
  },
  {
    id: 'tour-activity',
    title: 'Watch Live Activity Cards',
    description: 'See consultation and check-in progress in 3D cards.',
    targetId: 'activity-3d',
  },
  {
    id: 'tour-roles',
    title: 'Understand Role Features',
    description: 'Review what Patients, Staff, Admin, and Super Admin can do.',
    targetId: 'roles',
  },
];

function getDashboardPath(role) {
  return DASHBOARD_PATHS[normalizeRole(role)] || '/patient-dashboard';
}

function formatTimeFromNow(minutesFromNow) {
  const value = Number.isFinite(minutesFromNow) ? minutesFromNow : 0;
  const target = new Date(Date.now() + value * 60 * 1000);
  return target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Home() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [queueAhead, setQueueAhead] = useState(8);
  const [avgConsultationMinutes, setAvgConsultationMinutes] = useState(12);
  const [visitPriority, setVisitPriority] = useState('routine');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedHospital, setSelectedHospital] = useState('all');
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);
  const [liveClock, setLiveClock] = useState(() => new Date());
  const [completedTourStops, setCompletedTourStops] = useState({});

  const hospitalStaff = useMemo(() => getHospitalStaffEntries(), []);

  const doctors = useMemo(
    () =>
      hospitalStaff
        .filter((entry) => entry.role === 'doctor')
        .map((entry) => ({
          ...entry,
          rating: Number.isFinite(Number(entry.rating)) ? Number(entry.rating) : 4.6,
          experienceYears: Number.isFinite(Number(entry.experienceYears))
            ? Number(entry.experienceYears)
            : 0,
        })),
    [hospitalStaff]
  );

  const departmentOptions = useMemo(
    () =>
      [...new Set(doctors.map((doctor) => doctor.department).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [doctors]
  );

  const hospitalOptions = useMemo(
    () =>
      [...new Set(doctors.map((doctor) => doctor.hospitalName).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [doctors]
  );

  const filteredDoctors = useMemo(
    () =>
      doctors
        .filter(
          (doctor) =>
            (selectedDepartment === 'all' || doctor.department === selectedDepartment)
            && (selectedHospital === 'all' || doctor.hospitalName === selectedHospital)
        )
        .sort(
          (a, b) =>
            (b.rating || 0) - (a.rating || 0)
            || (b.experienceYears || 0) - (a.experienceYears || 0)
        ),
    [doctors, selectedDepartment, selectedHospital]
  );

  const hospitalCount = useMemo(
    () => new Set(doctors.map((doctor) => doctor.hospitalName)).size,
    [doctors]
  );

  const specialityCount = useMemo(
    () => new Set(doctors.map((doctor) => doctor.department)).size,
    [doctors]
  );

  const averageExperience = useMemo(() => {
    if (doctors.length === 0) {
      return '0 yrs';
    }

    const totalExperience = doctors.reduce(
      (sum, doctor) => sum + (Number(doctor.experienceYears) || 0),
      0
    );
    return `${(totalExperience / doctors.length).toFixed(1)} yrs`;
  }, [doctors]);

  const topDepartment = useMemo(() => {
    if (doctors.length === 0) {
      return 'General';
    }

    const counters = doctors.reduce((acc, doctor) => {
      const key = doctor.department || 'General';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const [department] = Object.entries(counters).sort((a, b) => b[1] - a[1])[0] || ['General'];
    return department;
  }, [doctors]);

  const estimatedWaitMinutes = useMemo(() => {
    const multiplier = PRIORITY_MULTIPLIER[visitPriority] || 1;
    const estimated = queueAhead * avgConsultationMinutes * multiplier;
    return Math.max(0, Math.round(estimated));
  }, [queueAhead, avgConsultationMinutes, visitPriority]);

  const recommendedArrivalBuffer = useMemo(() => {
    if (visitPriority === 'emergency') {
      return 0;
    }
    if (visitPriority === 'priority') {
      return 15;
    }
    return 30;
  }, [visitPriority]);

  const recommendedCheckInTime = useMemo(
    () => formatTimeFromNow(recommendedArrivalBuffer),
    [recommendedArrivalBuffer]
  );
  const featuredDoctors = filteredDoctors.slice(0, 6);

  const liveInsights = useMemo(
    () => [
      {
        title: 'Estimated wait right now',
        value: estimatedWaitMinutes === 0 ? 'No waiting' : `${estimatedWaitMinutes} min`,
        description: 'Based on your queue size, consultation speed, and selected priority.',
      },
      {
        title: 'Best check-in time',
        value: recommendedCheckInTime,
        description: 'Arrive around this time to reduce lobby crowd and idle waiting.',
      },
      {
        title: 'Most active speciality',
        value: topDepartment,
        description: 'This speciality currently has the strongest doctor availability.',
      },
      {
        title: 'Connected doctor network',
        value: `${featuredDoctors.length}/${doctors.length} highlighted`,
        description: 'Explore top-ranked doctors from your selected filters.',
      },
      {
        title: 'Hospital coverage',
        value: `${hospitalCount} hospitals`,
        description: `Serving ${specialityCount} specialities through one MediQueue home.`,
      },
    ],
    [
      doctors.length,
      estimatedWaitMinutes,
      featuredDoctors.length,
      hospitalCount,
      recommendedCheckInTime,
      specialityCount,
      topDepartment,
    ]
  );

  const activeInsight = liveInsights[activeInsightIndex] || liveInsights[0];
  const completedTourCount = useMemo(
    () => FIVE_MINUTE_TOUR_STOPS.filter((stop) => completedTourStops[stop.id]).length,
    [completedTourStops]
  );
  const tourProgress = Math.round((completedTourCount / FIVE_MINUTE_TOUR_STOPS.length) * 100);
  const liveClockLabel = useMemo(
    () => liveClock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    [liveClock]
  );

  useEffect(() => {
    if (liveInsights.length <= 1) {
      return undefined;
    }

    const insightTimer = window.setInterval(() => {
      setActiveInsightIndex((prev) => (prev + 1) % liveInsights.length);
    }, 4500);

    return () => window.clearInterval(insightTimer);
  }, [liveInsights.length]);

  useEffect(() => {
    const clockTimer = window.setInterval(() => {
      setLiveClock(new Date());
    }, 1000);

    return () => window.clearInterval(clockTimer);
  }, []);

  const toggleTourStop = (stopId) => {
    setCompletedTourStops((previous) => ({
      ...previous,
      [stopId]: !previous[stopId],
    }));
  };

  const actionPath = isAuthenticated ? getDashboardPath(user?.role) : '/auth';

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-side">
          {isAuthenticated ? (
            <span className="home-user-chip">
              {user?.name} ({user?.role})
            </span>
          ) : (
            <span className="home-user-chip home-user-chip-muted">Guest Access</span>
          )}
        </div>
        <div className="home-brand-center">
          <span className="home-brand-eyebrow">Welcome to</span>
          <h1>MediQueue</h1>
          <p>Smart queue, faster care, better hospital experience.</p>
        </div>
        <div className="home-header-actions">
          {isAuthenticated ? (
            <>
              <Link className="home-btn home-btn-primary" to={actionPath}>
                Go to Dashboard
              </Link>
              <button type="button" className="home-btn home-btn-secondary" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <Link className="home-btn home-btn-primary" to="/auth">
              Login / Register
            </Link>
          )}
        </div>
      </header>

      <main className="home-main">
        <section className="home-hero" id="hero">
          <div className="home-hero-content">
            <h2>One Dynamic Home for Patients, Doctors, and Hospitals</h2>
            <p>
              Explore doctors, estimate waiting time, and view live care activities from one
              responsive MediQueue experience.
            </p>
            <div className="home-hero-highlights">
              <span>Doctor discovery</span>
              <span>Smart visit planning</span>
              <span>Live care visuals</span>
            </div>
          </div>
          <aside className="home-live-panel">
            <p className="home-live-panel-label">Live MediQueue Pulse</p>
            <p className="home-live-clock">{liveClockLabel}</p>
            <h3>{activeInsight.title}</h3>
            <p className="home-live-value">{activeInsight.value}</p>
            <p className="home-live-description">{activeInsight.description}</p>
            <div className="home-live-dots">
              {liveInsights.map((insight, index) => (
                <button
                  key={insight.title}
                  type="button"
                  aria-label={`View ${insight.title}`}
                  className={`home-live-dot ${index === activeInsightIndex ? 'is-active' : ''}`}
                  onClick={() => setActiveInsightIndex(index)}
                />
              ))}
            </div>
          </aside>
        </section>

        <section className="home-tour" id="tour">
          <div className="home-tour-header">
            <h3>5-Minute MediQueue Experience</h3>
            <p>
              Use this guided path to interact with planner, doctors, videos, and role features.
            </p>
          </div>
          <div className="home-tour-progress">
            <span>{completedTourCount} completed</span>
            <div className="home-tour-progress-track" aria-hidden="true">
              <div className="home-tour-progress-fill" style={{ width: `${tourProgress}%` }} />
            </div>
            <span>{tourProgress}%</span>
          </div>
          <div className="home-tour-grid">
            {FIVE_MINUTE_TOUR_STOPS.map((stop) => {
              const completed = Boolean(completedTourStops[stop.id]);
              return (
                <article key={stop.id} className={`home-tour-card ${completed ? 'is-complete' : ''}`}>
                  <h4>{stop.title}</h4>
                  <p>{stop.description}</p>
                  <div className="home-tour-actions">
                    <button
                      type="button"
                      className="home-btn home-btn-secondary home-btn-compact"
                      onClick={() => toggleTourStop(stop.id)}
                    >
                      {completed ? 'Completed' : 'Mark Complete'}
                    </button>
                    <a className="home-tour-link" href={`#${stop.targetId}`}>
                      Open section
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="home-snapshot" id="snapshot">
          <h3>Patient & Doctor Snapshot</h3>
          <div className="home-stat-grid">
            <article className="home-stat-card">
              <p className="home-stat-value">{doctors.length}</p>
              <p className="home-stat-label">Doctors Available</p>
            </article>
            <article className="home-stat-card">
              <p className="home-stat-value">{hospitalCount}</p>
              <p className="home-stat-label">Hospitals Covered</p>
            </article>
            <article className="home-stat-card">
              <p className="home-stat-value">{specialityCount}</p>
              <p className="home-stat-label">Specialties</p>
            </article>
            <article className="home-stat-card">
              <p className="home-stat-value">{averageExperience}</p>
              <p className="home-stat-label">Avg. Experience</p>
            </article>
            <article className="home-stat-card">
              <p className="home-stat-value">{topDepartment}</p>
              <p className="home-stat-label">Top Department</p>
            </article>
          </div>
        </section>

        <section className="home-media-section" id="images">
          <div className="home-section-header">
            <h3>Healthcare Activity Images</h3>
            <p>These visuals help patients understand what happens during a hospital visit.</p>
          </div>
          <div className="home-image-grid">
            {HOME_ACTIVITY_IMAGES.map((item) => (
              <article key={item.id} className="home-image-card">
                <img src={item.imageUrl} alt={item.title} loading="lazy" />
                <div className="home-image-content">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="home-media-section" id="videos">
          <div className="home-section-header">
            <h3>Activity Videos</h3>
            <p>Watch short clips to understand queue and consultation steps.</p>
          </div>
          <div className="home-video-grid">
            {HOME_ACTIVITY_VIDEOS.map((item) => (
              <article key={item.id} className="home-video-card">
                <video className="home-video-player" controls preload="none" poster={item.poster}>
                  <source src={item.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="home-video-content">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="home-media-section" id="activity-3d">
          <div className="home-section-header">
            <h3>3D Activity View</h3>
            <p>Use these cards to view activity progress in a simple visual form.</p>
          </div>
          <div className="home-3d-grid">
            <Exercise3DCard
              title="Consultation Progress"
              description="See how many consultations are completed today."
              icon="🩺"
              progress={78}
              color="#2563eb"
            />
            <Exercise3DCard
              title="Patient Check-In"
              description="Track how quickly patients are getting checked in."
              icon="🧾"
              progress={64}
              color="#0ea5e9"
            />
            <Exercise3DCard
              title="Follow-Up Completion"
              description="Check daily follow-up completion progress."
              icon="✅"
              progress={86}
              color="#16a34a"
            />
          </div>
        </section>

        <section className="home-tools" id="tools">
          <article className="home-tool-card">
            <h3>Patient Visit Planner</h3>
            <p className="home-tool-description">
              Enter your details to estimate waiting time before you visit.
            </p>

            <div className="home-form-grid">
              <label className="home-input-group">
                <span>Patients ahead of you</span>
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={queueAhead}
                  onChange={(e) =>
                    setQueueAhead(Math.max(0, Math.min(80, Number(e.target.value) || 0)))
                  }
                />
              </label>

              <label className="home-input-group">
                <span>Avg consultation time</span>
                <select
                  value={avgConsultationMinutes}
                  onChange={(e) => setAvgConsultationMinutes(Number(e.target.value))}
                >
                  <option value={8}>8 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={12}>12 minutes</option>
                  <option value={15}>15 minutes</option>
                </select>
              </label>

              <label className="home-input-group">
                <span>Visit type</span>
                <select value={visitPriority} onChange={(e) => setVisitPriority(e.target.value)}>
                  <option value="routine">Routine</option>
                  <option value="priority">Priority</option>
                  <option value="emergency">Emergency</option>
                </select>
              </label>
            </div>

            <div className="home-result-card">
              <h4>Estimated Visit Window</h4>
              <p className="home-result-time">
                {estimatedWaitMinutes === 0
                  ? 'No waiting expected'
                  : `${estimatedWaitMinutes} minutes estimated wait`}
              </p>
              <ul className="home-result-list">
                <li>Priority mode: {PRIORITY_LABELS[visitPriority]}</li>
                <li>Suggested check-in time: {recommendedCheckInTime}</li>
              </ul>
              <Link className="home-btn home-btn-primary" to={actionPath}>
                {isAuthenticated ? 'Continue to Dashboard' : 'Login to Book Appointment'}
              </Link>
            </div>
          </article>

          <article className="home-tool-card">
            <h3>Doctor Discovery</h3>
            <p className="home-tool-description">
              Choose department and hospital to see doctors available for you.
            </p>

            <div className="home-form-grid home-filter-grid">
              <label className="home-input-group">
                <span>Department</span>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="all">All Departments</option>
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              <label className="home-input-group">
                <span>Hospital</span>
                <select value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
                  <option value="all">All Hospitals</option>
                  {hospitalOptions.map((hospitalName) => (
                    <option key={hospitalName} value={hospitalName}>
                      {hospitalName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {featuredDoctors.length > 0 ? (
              <div className="home-doctor-grid">
                {featuredDoctors.map((doctor) => (
                  <article key={doctor.id} className="home-doctor-card">
                    <div className="home-doctor-header">
                      <img
                        src={doctor.image}
                        alt={doctor.name}
                        className="home-doctor-avatar"
                        loading="lazy"
                      />
                      <div>
                        <h4>{doctor.name}</h4>
                        <p>{doctor.department}</p>
                      </div>
                    </div>
                    <p className="home-doctor-hospital">{doctor.hospitalName}</p>
                    <div className="home-doctor-meta">
                      <span>{doctor.experienceYears} yrs exp</span>
                      <span>Rating {doctor.rating.toFixed(1)}</span>
                    </div>
                    <p className="home-doctor-phone">{doctor.phone}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="home-empty-state">
                No doctors match the selected filters. Try another department or hospital.
              </p>
            )}

            <div className="home-tool-actions">
              <Link className="home-btn home-btn-secondary" to={actionPath}>
                {isAuthenticated ? 'Open Dashboard' : 'Login to Continue'}
              </Link>
            </div>
          </article>
        </section>

        <section className="home-features" id="roles">
          <h3>Role-Based Dashboard Features</h3>
          <div className="home-feature-grid">
            <article className="home-feature-card">
              <h4>Patient</h4>
              <p>Join queues, book appointments, and track your status in real time.</p>
            </article>
            <article className="home-feature-card">
              <h4>Attendant / Doctor</h4>
              <p>View live department queues, update status, and manage service priority.</p>
            </article>
            <article className="home-feature-card">
              <h4>Reception</h4>
              <p>Handle appointments, monitor queue stats, and manage hospital staff directory.</p>
            </article>
            <article className="home-feature-card">
              <h4>Admin</h4>
              <p>Manage hospital staff data with hospital-based admin access and control.</p>
            </article>
            <article className="home-feature-card">
              <h4>Super Admin</h4>
              <p>Add or delete hospitals from the global catalog using one centralized dashboard.</p>
            </article>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
