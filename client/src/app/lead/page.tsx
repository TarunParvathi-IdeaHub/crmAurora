'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { BookOpen, Users, GraduationCap, CheckCircle2, Award, Shield, Star } from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000';

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;
const MOBILE_RE = /^[6-9]\d{9}$/;
const NAME_RE = /^[A-Za-z\s]+$/;

const INDIAN_STATES: string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const SOURCE_OPTIONS = [
  'Google Search',
  'Social Media',
  'Friend / Family',
  'School / College',
  'Advertisement',
  'Education Fair',
  'Alumni Referral',
  'Other',
];

// ── REPLACE THIS URL with your actual campus photo ──────────────────────────
const CAMPUS_PHOTO_URL = 'https://images.unsplash.com/photo-1562774053-701939374585?w=1600&auto=format&fit=crop&q=80';
// ─────────────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '25+', label: 'Years of Excellence' },
  { value: '10K+', label: 'Alumni Network' },
  { value: '50+', label: 'Programmes' },
];

const ACCREDITATIONS = [
  { label: 'NAAC A+', icon: Award },
  { label: 'UGC Approved', icon: Shield },
  { label: 'NIRF Ranked', icon: Star },
];

// ── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: 'easeOut' as const } },
} satisfies Variants;

const fadeSlideLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

const fadeSlideRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' as const, delay: 0.15 } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.4 } },
};

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const bannerVariant = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

// ── Types ────────────────────────────────────────────────────────────────────

type LeadFormData = {
  firstName: string;
  lastName: string;
  mobileNo: string;
  email: string;
  state: string;
  institutionId: string;
  degreeLevelId: string;
  programId: string;
  admissionCycleId: string;
  admissionCycleName: string;
};

type SelectOption = {
  id: string;
  label: string;
};

const emptyForm: LeadFormData = {
  firstName: '',
  lastName: '',
  mobileNo: '',
  email: '',
  state: '',
  institutionId: '',
  degreeLevelId: '',
  programId: '',
  admissionCycleId: '',
  admissionCycleName: '',
};

// ── Page component ───────────────────────────────────────────────────────────

export default function LeadPage() {
  const [formData, setFormData] = useState<LeadFormData>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isAuthorizationChecked, setIsAuthorizationChecked] = useState(false);
  const [source, setSource] = useState('');
  const [formVisible, setFormVisible] = useState(true);
  const [formStep, setFormStep] = useState<1 | 2>(1);

  // Dropdown options
  const [institutionOptions, setInstitutionOptions] = useState<SelectOption[]>([]);
  const [degreeLevelOptions, setDegreeLevelOptions] = useState<SelectOption[]>([]);
  const [programOptions, setProgramOptions] = useState<SelectOption[]>([]);

  // Loading states
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loadingDegreeLevels, setLoadingDegreeLevels] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingCycle, setLoadingCycle] = useState(false);

  // Error messages
  const [fetchError, setFetchError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LeadFormData, string>>>({});

  // ── Fetch institutions on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoadingInstitutions(true);
    setFetchError('');

    fetch(`${API_BASE}/api/institutions/active`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load institutions');
        return r.json() as Promise<{ id: string; institutionName: string; institutionCode: string }[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setInstitutionOptions(
          data.map((i) => ({ id: i.id, label: `${i.institutionCode} - ${i.institutionName}` }))
        );
      })
      .catch(() => {
        if (!cancelled) setFetchError('Failed to load institutions. Please refresh the page.');
      })
      .finally(() => {
        if (!cancelled) setLoadingInstitutions(false);
      });

    return () => { cancelled = true; };
  }, []);

  // ── Fetch degree levels when institution changes ─────────────────────────
  useEffect(() => {
    if (!formData.institutionId) {
      setDegreeLevelOptions([]);
      return;
    }

    let cancelled = false;
    setLoadingDegreeLevels(true);
    setFetchError('');

    fetch(`${API_BASE}/api/degree-levels/by-institution/${formData.institutionId}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load degree levels');
        return r.json() as Promise<{ degreeLevels: { id: string; levelName: string }[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setDegreeLevelOptions(
          data.degreeLevels.map((l) => ({ id: l.id, label: l.levelName }))
        );
      })
      .catch(() => {
        if (!cancelled) setFetchError('Failed to load degree levels. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoadingDegreeLevels(false);
      });

    return () => { cancelled = true; };
  }, [formData.institutionId]);

  // ── Fetch programs when degree level changes ─────────────────────────────
  useEffect(() => {
    if (!formData.institutionId || !formData.degreeLevelId) {
      setProgramOptions([]);
      return;
    }

    let cancelled = false;
    setLoadingPrograms(true);
    setFetchError('');

    fetch(`${API_BASE}/api/programme/${formData.institutionId}/${formData.degreeLevelId}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load programs');
        return r.json() as Promise<{ id: string; programName: string; programSname: string }[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setProgramOptions(
          data.map((p) => ({ id: p.id, label: `${p.programSname} - ${p.programName}` }))
        );
      })
      .catch(() => {
        if (!cancelled) setFetchError('Failed to load programs. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoadingPrograms(false);
      });

    return () => { cancelled = true; };
  }, [formData.institutionId, formData.degreeLevelId]);

  // ── Fetch admission cycle when program changes ───────────────────────────
  useEffect(() => {
    if (!formData.institutionId || !formData.degreeLevelId || !formData.programId) {
      setFormData((prev) => ({ ...prev, admissionCycleId: '', admissionCycleName: '' }));
      return;
    }

    let cancelled = false;
    setLoadingCycle(true);
    setFetchError('');

    const params = new URLSearchParams({
      institutionId: formData.institutionId,
      levelId:       formData.degreeLevelId,
      programId:     formData.programId,
    });

    fetch(`${API_BASE}/api/admission-cycles/latest-active?${params}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Admission cycle not found');
        return r.json() as Promise<{ id: string; admissionCycleName: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        setFormData((prev) => ({
          ...prev,
          admissionCycleId: data.id,
          admissionCycleName: data.admissionCycleName,
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError('No active admission cycle found for the selected programme.');
          setFormData((prev) => ({ ...prev, admissionCycleId: '', admissionCycleName: '' }));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCycle(false);
      });

    return () => { cancelled = true; };
  }, [formData.institutionId, formData.degreeLevelId, formData.programId]);

  // ── isFormReady ──────────────────────────────────────────────────────────
  const isFormReady = useMemo(() => {
    const allFilled =
      formData.firstName.trim().length > 0 &&
      formData.lastName.trim().length > 0 &&
      formData.mobileNo.trim().length > 0 &&
      formData.email.trim().length > 0 &&
      formData.state.trim().length > 0 &&
      formData.institutionId.trim().length > 0 &&
      formData.degreeLevelId.trim().length > 0 &&
      formData.programId.trim().length > 0 &&
      formData.admissionCycleId.trim().length > 0;

    return allFilled && isAuthorizationChecked;
  }, [formData, isAuthorizationChecked]);

  // ── step1Ready ───────────────────────────────────────────────────────────
  const step1Ready = useMemo(() =>
    formData.firstName.trim().length > 0 &&
    formData.lastName.trim().length > 0 &&
    formData.mobileNo.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    formData.state.trim().length > 0
  , [formData.firstName, formData.lastName, formData.mobileNo, formData.email, formData.state]);

  // ── handleNext ───────────────────────────────────────────────────────────
  function handleNext() {
    const errors: Partial<Record<keyof LeadFormData, string>> = {};
    if (!EMAIL_RE.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!MOBILE_RE.test(formData.mobileNo.trim())) {
      errors.mobileNo = 'Please enter a valid 10-digit mobile number.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) setFormStep(2);
  }

  // ── Validate fields ──────────────────────────────────────────────────────
  function validateFields(): boolean {
    const errors: Partial<Record<keyof LeadFormData, string>> = {};

    if (!NAME_RE.test(formData.firstName.trim())) {
      errors.firstName = 'First name should contain only letters and spaces.';
    }
    if (!NAME_RE.test(formData.lastName.trim())) {
      errors.lastName = 'Last name should contain only letters and spaces.';
    }
    if (!EMAIL_RE.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!MOBILE_RE.test(formData.mobileNo.trim())) {
      errors.mobileNo = 'Please enter a valid 10-digit mobile number.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── handleChange ─────────────────────────────────────────────────────────
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    let nextValue = value;

    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setFetchError('');

    if (name === 'institutionId') {
      setFormData((prev) => ({
        ...prev,
        institutionId: value,
        degreeLevelId: '',
        programId: '',
        admissionCycleId: '',
        admissionCycleName: '',
      }));
      setDegreeLevelOptions([]);
      setProgramOptions([]);
      return;
    }

    if (name === 'degreeLevelId') {
      setFormData((prev) => ({
        ...prev,
        degreeLevelId: value,
        programId: '',
        admissionCycleId: '',
        admissionCycleName: '',
      }));
      setProgramOptions([]);
      return;
    }

    if (name === 'programId') {
      setFormData((prev) => ({
        ...prev,
        programId: value,
        admissionCycleId: '',
        admissionCycleName: '',
      }));
      return;
    }

    if (name === 'firstName' || name === 'lastName') {
      nextValue = value.replace(/[^A-Za-z\s]/g, '');
    }

    if (name === 'mobileNo') {
      nextValue = value.replace(/\D/g, '').slice(0, 10);
    }

    if (name === 'email') {
      const compact = value.replace(/\s+/g, '');
      nextValue = compact.replace(/[^A-Za-z0-9@._%+-]/g, '');
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));
  };

  // ── handleSubmit ─────────────────────────────────────────────────────────
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formStep !== 2) return;
    setSubmitMessage('');
    setSubmitSuccess(false);

    if (!isFormReady) {
      setSubmitMessage('Please fill all required fields and accept the consent.');
      return;
    }

    if (!validateFields()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/enquiryform/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName:       formData.firstName.trim(),
          lastName:        formData.lastName.trim(),
          mobileNo:        formData.mobileNo.trim(),
          email:           formData.email.trim(),
          state:           formData.state,
          institutionId:   formData.institutionId,
          degreeLevelId:   formData.degreeLevelId,
          programId:       formData.programId,
          admissionCycleId: formData.admissionCycleId,
        }),
      });

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setSubmitMessage(data.error ?? 'Enquiry submission failed. Please try again.');
        return;
      }

      setSubmitSuccess(true);
      setSubmitMessage('Your enquiry has been submitted successfully!');
      setFormData(emptyForm);
      setIsAuthorizationChecked(false);
      setSource('');
      setFormStep(1);
      setDegreeLevelOptions([]);
      setProgramOptions([]);
    } catch {
      setSubmitMessage('Unable to submit now. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col">

      <div className="relative flex min-h-screen flex-col lg:flex-row">

        {/* Background campus photo — replace CAMPUS_PHOTO_URL at top of file */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${CAMPUS_PHOTO_URL}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/92 via-[#0a1628]/80 to-[#0a1628]/70" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0a1628] to-transparent" />

        {/* ── TOP NAVBAR ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 lg:px-14"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-white">Aurora University</p>
              <p className="text-[10px] text-white/60 tracking-wide uppercase">Deemed to be University</p>
            </div>
          </div>
          
        </motion.div>


        {/* ── LEFT PANEL — animates width when form opens ──────────── */}
        <motion.div
          initial={{ flexBasis: '100%' }}
          animate={{ flexBasis: formVisible ? '52%' : '100%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="relative z-10 flex flex-col justify-center px-6 pb-16 pt-28 lg:px-14 lg:pb-24 lg:pt-28"
        >
          <div className={`transition-all duration-500 ${!formVisible ? 'lg:max-w-2xl lg:mx-auto' : ''}`}>

            {/* Main heading */}
            <motion.h1
              variants={fadeSlideLeft}
              initial="hidden"
              animate="visible"
              className="text-4xl font-extrabold leading-[1.12] tracking-tight text-white lg:text-[3.25rem]"
            >
              Shape Your Future at
              <span className="mt-2 block text-[#60a5fa]">Aurora University</span>
            </motion.h1>

            <motion.p variants={fadeUp} initial="hidden" animate="visible" className="mt-5 max-w-md text-base leading-relaxed text-white/70">
              A legacy of academic excellence, world-class faculty, and industry-driven curriculum
              to shape tomorrow&apos;s leaders and innovators.
            </motion.p>

            {/* Accreditation badges */}
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mt-8 flex flex-wrap gap-3">
              {ACCREDITATIONS.map(({ label, icon: Icon }) => (
                <motion.div key={label} variants={cardVariant} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm ring-1 ring-white/20">
                  <Icon className="h-3.5 w-3.5 text-[#fbbf24]" />
                  <span className="text-xs font-semibold text-white">{label}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Stats row */}
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {STATS.map(({ value, label }) => (
                <motion.div key={label} variants={cardVariant}>
                  <p className="text-3xl font-extrabold text-white">{value}</p>
                  <p className="mt-0.5 text-xs text-white/55">{label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Feature highlights */}
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mt-10 space-y-3">
              {[
                { icon: BookOpen, text: 'Industry-focused curriculum & live projects' },
                { icon: Users,    text: 'Experienced faculty with global expertise' },
                { icon: Award,    text: '95% placement rate with 500+ recruiters' },
              ].map(({ icon: Icon, text }) => (
                <motion.div key={text} variants={cardVariant} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#60a5fa]/20">
                    <Icon className="h-4 w-4 text-[#60a5fa]" />
                  </div>
                  <p className="text-sm text-white/80">{text}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Primary CTA — only visible before form opens */}
            {!formVisible && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
              >
                <button
                  onClick={() => setFormVisible(true)}
                  className="rounded-xl bg-gradient-to-r from-[#1e3a8a] to-[#2f64d6] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#2f64d6]/40 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
                >
                  Start Your Application →
                </button>
                <a href="/login" className="text-sm text-white/60 underline-offset-2 transition hover:text-white/90 hover:underline">
                  Already registered? Login →
                </a>
              </motion.div>
            )}

          </div>
        </motion.div>

        {/* ── RIGHT PANEL — slides in when CTA is clicked ──────────── */}
        <AnimatePresence>
          {formVisible && (
            <motion.div
              key="form-panel"
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative z-10 flex items-start justify-center px-4 pb-10 pt-24 lg:w-[48%] lg:items-center lg:px-8 lg:pb-10 lg:pt-24"
            >
              <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_32px_80px_-8px_rgba(0,0,0,0.5)]">

                {/* Card header strip */}
                <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2f64d6] px-6 py-5">
                  <h2 className="text-xl font-bold text-white">Enquiry Form</h2>
                  <p className="mt-0.5 text-xs text-blue-200">Fill in your details and we&apos;ll get back to you shortly</p>
                </div>

                {/* Form body */}
                <div className="px-6 py-5">

                  {/* Fetch error banner */}
                  <AnimatePresence>
                    {fetchError && (
                      <motion.p
                        variants={bannerVariant}
                        initial="hidden" animate="visible" exit="exit"
                        className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700"
                      >
                        {fetchError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit}>
                    <AnimatePresence mode="wait">

                      {/* ── STEP 1: Personal Details ── */}
                      {formStep === 1 && (
                        <motion.div
                          key="step1"
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -24 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <Field id="firstName" label="First Name" required value={formData.firstName} onChange={handleChange} placeholder="First name" />
                            <Field id="lastName" label="Last Name" required value={formData.lastName} onChange={handleChange} placeholder="Last name" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Field id="mobileNo" label="Mobile" required value={formData.mobileNo} onChange={handleChange} placeholder="10-digit number" type="tel" error={fieldErrors.mobileNo} />
                            <Field id="email" label="Email" required value={formData.email} onChange={handleChange} placeholder="Your email" type="email" error={fieldErrors.email} />
                          </div>
                          <SelectField id="state" label="State" required value={formData.state} onChange={handleChange} options={INDIAN_STATES.map((s) => ({ id: s, label: s }))} placeholder="Select state" />
                          <button
                            type="button"
                            onClick={handleNext}
                            disabled={!step1Ready}
                            className={`h-11 w-full rounded-lg text-sm font-bold text-white transition-all duration-200 ${
                              step1Ready
                                ? 'cursor-pointer bg-gradient-to-r from-[#1e3a8a] to-[#2f64d6] shadow-lg shadow-[#2f64d6]/30 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0'
                                : 'cursor-not-allowed bg-slate-300 opacity-60'
                            }`}
                          >
                            Next →
                          </button>

                        </motion.div>
                      )}

                      {/* ── STEP 2: Academic Preferences ── */}
                      {formStep === 2 && (
                        <motion.div
                          key="step2"
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -24 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-4"
                        >
                          <SelectField id="institutionId" label="Institution" required value={formData.institutionId} onChange={handleChange} options={institutionOptions} placeholder={loadingInstitutions ? 'Loading…' : 'Select institution'} disabled={loadingInstitutions} loading={loadingInstitutions} />
                          <SelectField id="degreeLevelId" label="Degree Level" required value={formData.degreeLevelId} onChange={handleChange} options={degreeLevelOptions} placeholder={loadingDegreeLevels ? 'Loading…' : 'Select degree level'} disabled={!formData.institutionId || loadingDegreeLevels} loading={loadingDegreeLevels} />
                          <SelectField id="programId" label="Program" required value={formData.programId} onChange={handleChange} options={programOptions} placeholder={loadingPrograms ? 'Loading…' : 'Select program'} disabled={!formData.degreeLevelId || loadingPrograms} loading={loadingPrograms} />

                          {/* Admission Cycle */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Admission Cycle <span className="text-red-500">*</span>
                            </label>
                            {loadingCycle ? (
                              <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
                                <svg className="h-3.5 w-3.5 animate-spin text-[#2f64d6]" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                <span className="text-xs text-slate-400">Fetching cycle…</span>
                              </div>
                            ) : formData.admissionCycleName ? (
                              <div className="flex h-10 items-center rounded-lg border border-blue-200 bg-blue-50 px-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2f64d6]/10 px-3 py-0.5 text-xs font-semibold text-[#2f64d6]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {formData.admissionCycleName}
                                </span>
                              </div>
                            ) : (
                              <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3">
                                <span className="text-xs text-slate-400">Auto-filled after programme selection</span>
                              </div>
                            )}
                          </div>

                          {/* How did you hear about us */}
                          <div className="space-y-1">
                            <label htmlFor="source" className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              How did you hear about us?
                            </label>
                            <select
                              id="source"
                              value={source}
                              onChange={(e) => setSource(e.target.value)}
                              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition hover:border-slate-400 focus:border-[#2f64d6] focus:ring-2 focus:ring-[#2f64d6]/10"
                            >
                              <option value="">Select an option</option>
                              {SOURCE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>

                          {/* Consent */}
                          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                              <input
                                id="authorizationCheck"
                                type="checkbox"
                                checked={isAuthorizationChecked}
                                onChange={(e) => setIsAuthorizationChecked(e.target.checked)}
                                className="peer h-4 w-4 cursor-pointer appearance-none rounded border-2 border-slate-300 bg-white transition checked:border-[#2f64d6] checked:bg-[#2f64d6] focus:outline-none focus:ring-2 focus:ring-[#2f64d6]/15"
                              />
                              {isAuthorizationChecked && (
                                <svg className="pointer-events-none absolute h-2.5 w-2.5 text-white" viewBox="0 0 12 10" fill="none">
                                  <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <label htmlFor="authorizationCheck" className="cursor-pointer text-xs leading-relaxed text-slate-500">
                              I authorize Aurora University to contact me via calls, SMS, WhatsApp &amp; email for admission-related communication.
                            </label>
                          </div>

                          {/* Submit message */}
                          <AnimatePresence>
                            {submitMessage && (
                              <motion.p
                                variants={bannerVariant}
                                initial="hidden" animate="visible" exit="exit"
                                className={`rounded-lg px-4 py-2.5 text-xs ${
                                  submitSuccess
                                    ? 'border border-green-200 bg-green-50 text-green-700'
                                    : 'border border-red-200 bg-red-50 text-red-700'
                                }`}
                              >
                                {submitMessage}
                              </motion.p>
                            )}
                          </AnimatePresence>

                          {/* Back + Submit row */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setFormStep(1)}
                              className="h-11 w-24 shrink-0 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              ← Back
                            </button>
                            <button
                              type="submit"
                              disabled={!isFormReady || isSubmitting}
                              className={`h-11 flex-1 rounded-lg text-sm font-bold text-white transition-all duration-200 ${
                                isFormReady && !isSubmitting
                                  ? 'cursor-pointer bg-gradient-to-r from-[#1e3a8a] to-[#2f64d6] shadow-lg shadow-[#2f64d6]/30 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0'
                                  : 'cursor-not-allowed bg-slate-300 opacity-60'
                              }`}
                            >
                              {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                  </svg>
                                  Submitting…
                                </span>
                              ) : (
                                'Submit Enquiry →'
                              )}
                            </button>
                          </div>

                        </motion.div>
                      )}

                    </AnimatePresence>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────

type FieldProps = {
  id: keyof LeadFormData;
  label: string;
  value: string;
  placeholder: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: 'text' | 'email' | 'tel';
  disabled?: boolean;
  required?: boolean;
  error?: string;
  inputMode?: 'text' | 'email' | 'numeric' | 'tel';
  pattern?: string;
  maxLength?: number;
};

function Field({
  id,
  label,
  value,
  placeholder,
  onChange,
  type = 'text',
  disabled = false,
  required = false,
  error,
  inputMode,
  pattern,
  maxLength,
}: FieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`h-10 w-full rounded-lg border px-3 text-sm text-slate-900 outline-none transition hover:border-slate-400 focus:ring-2 ${
          error
            ? 'border-red-400 bg-red-50/40 focus:border-red-400 focus:ring-red-100'
            : 'border-slate-300 bg-white focus:border-[#2f64d6] focus:ring-[#2f64d6]/10'
        } ${disabled ? 'cursor-not-allowed bg-slate-100 opacity-70' : ''}`}
        disabled={disabled}
      />
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SelectField ──────────────────────────────────────────────────────────────

type SelectFieldProps = {
  id: keyof LeadFormData;
  label: string;
  value: string;
  placeholder: string;
  options: SelectOption[];
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
};

function SelectField({ id, label, value, placeholder, options, onChange, disabled = false, required = false, loading = false }: SelectFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          className={`h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition hover:border-slate-400 focus:border-[#2f64d6] focus:ring-2 focus:ring-[#2f64d6]/10 ${
            disabled ? 'cursor-not-allowed bg-slate-100 opacity-70' : 'bg-white'
          }`}
          disabled={disabled}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        {loading && (
          <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2">
            <svg className="h-3.5 w-3.5 animate-spin text-[#2f64d6]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}