import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/common/PageHeader';
import RiskBadge from '@/components/badges/RiskBadge';
import MetricCard from '@/components/cards/MetricCard';
import Button from '@/components/forms/Button';
import Input from '@/components/forms/Input';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import LoadingState from '@/components/common/LoadingState';
import predictionsApi from '@/api/predictions';
import warehousesApi from '@/api/warehouses';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { getErrorMessage } from '@/api/client';
import { formatCurrency, formatPercentage, formatDate } from '@/utils/formatters';
import { CROP_LIST, DISTRICT_COORDS, ROAD_QUALITY_OPTIONS } from '@/utils/constants';
import OptimalRouteLogisticsPanel from '@/components/logistics/OptimalRouteLogisticsPanel';
import {
  Sprout,
  MapPin,
  Thermometer,
  CloudRain,
  Truck,
  Boxes,
  Camera,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Warehouse,
  History,
  RotateCcw,
  ShieldAlert,
  Mic,
  Calendar,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Volume2,
  Wind,
  CloudSun,
  Radio,
  Play,
  Clock,
  Timer,
  Check,
} from 'lucide-react';

// Haversine formula for distance calculation between farm district & warehouse
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper to compute exact safe-dispatch cutoff date from creation time + shelf life
function calculateSafeUntilDate(createdAt, shelfLifeDays) {
  if (!createdAt || shelfLifeDays == null) return null;
  try {
    let str = String(createdAt).trim();
    if (str && !str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
      if (str.includes('T')) str = str + 'Z';
      else if (str.includes(' ')) str = str.replace(' ', 'T') + 'Z';
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    const safeDate = new Date(d.getTime() + shelfLifeDays * 24 * 60 * 60 * 1000);
    return safeDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return null;
  }
}

// Helper to generate temporary numerical placeholders formatted appropriately for the 5 metrics
function generateRandomMetrics() {
  const spoilage = (Math.random() * 80 + 10).toFixed(2);
  const confidence = (Math.random() * 18 + 80).toFixed(1);
  const loss = (Math.random() * 28 + 2).toFixed(1);
  const shelf = (Math.random() * 14 + 1).toFixed(1);
  const impactNum = Math.floor(Math.random() * 40000 + 4000);
  const impact = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(impactNum);

  return {
    spoilage: `${spoilage}%`,
    confidence: `${confidence}%`,
    loss: `${loss}%`,
    shelf: `${shelf} Days`,
    impact: impact,
  };
}

export default function NewPrediction() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const farmDistrict = user?.district || '';

  // Wizard Step State (1 to 3) - Structured ML Prediction Flow
  const [currentStep, setCurrentStep] = useState(1);

  // Available warehouses list for auto-distance lookup
  const [warehouses, setWarehouses] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    crop: 'Potato',
    harvest_date: new Date().toISOString().split('T')[0],
    temperature: 28.0,
    humidity: 65.0,
    road_condition: 'National Highway',
    quantity_tons: 5.0,
    recommended_facility: '',
    image_data: null,
    picture_spoilage_prob: null,

    // Internal ML Benchmark Parameters
    actual_transit_days: 3.0,
    expected_transit_days: 1.5,
    arrival_volume: 180.0,
    avg_market_volume: 90.0,
    custom_distance_km: null,
  });

  // UI States
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [isListening, setIsListening] = useState(false);

  // Continuous Numerical Loading Animation State & Refs
  const [animatedValues, setAnimatedValues] = useState(() => generateRandomMetrics());
  const animationFrameRef = React.useRef(null);
  const isAnimatingRef = React.useRef(false);

  const startAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isAnimatingRef.current = true;
    setAnimatedValues(generateRandomMetrics());
    let lastTime = performance.now();

    const loop = (currentTime) => {
      if (!isAnimatingRef.current) return;
      if (currentTime - lastTime >= 70) {
        setAnimatedValues(generateRandomMetrics());
        lastTime = currentTime;
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const stopAnimation = () => {
    isAnimatingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Ensure timer / animation frame cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, []);

  // Live Weather Telemetry State
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  // MobileNetV2 Image Quality State
  const [qualityResult, setQualityResult] = useState(null);
  const [analyzingQuality, setAnalyzingQuality] = useState(false);
  const [qualityError, setQualityError] = useState(null);

  // Spoilage Advisory & TTS State
  const advisoryLanguage = language;
  const [advisoryData, setAdvisoryData] = useState(null);
  const [generatingAdvisory, setGeneratingAdvisory] = useState(false);
  const [advisoryError, setAdvisoryError] = useState(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);

  // Revoke object URL on change/unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [audioBlobUrl]);

  // Fetch warehouses for auto-matching distance
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const resp = await warehousesApi.listWarehouses();
        setWarehouses(resp.data || []);
      } catch (err) {
        // Fallback gracefully
      }
    };
    fetchWarehouses();
  }, []);

  // Compute storage elapsed days from harvest date
  const computedStorageDays = React.useMemo(() => {
    if (!formData.harvest_date) return 0;
    const [y, m, d] = formData.harvest_date.split('-').map(Number);
    const harvest = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    harvest.setHours(0, 0, 0, 0);
    const diffTime = today - harvest;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [formData.harvest_date]);

  // Auto-calculate distance to nearest warehouse
  const computedDistanceKm = React.useMemo(() => {
    if (formData.custom_distance_km && formData.custom_distance_km > 0) {
      return Number(formData.custom_distance_km);
    }

    const farmCoords = DISTRICT_COORDS[farmDistrict];
    if (!farmCoords) return null;
    if (warehouses.length > 0) {
      let nearestDist = Infinity;
      warehouses.forEach((w) => {
        if (w.latitude && w.longitude) {
          const d = calculateHaversineDistance(farmCoords[0], farmCoords[1], w.latitude, w.longitude);
          if (d < nearestDist) nearestDist = d;
        }
      });
      if (nearestDist !== Infinity) return parseFloat(nearestDist.toFixed(1));
    }
    return 35.0; // Fallback district average
  }, [farmDistrict, formData.custom_distance_km, warehouses]);

  // Voice Input (Web Speech API)
  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(`${t('voice_unsupported')} ${t('voice_help')}`);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;

      setIsListening(true);
      setError(null);

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setIsListening(false);

        const textLower = text.toLowerCase();
        const matchedCrop = CROP_LIST.find((c) => textLower.includes(c.toLowerCase()));
        if (matchedCrop) handleChange('crop', matchedCrop);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  // Field change helper
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Image upload handler
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError(t('image_too_large'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        handleChange('image_data', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Step Validation logic
  const validateStep = (step) => {
    setError(null);
    if (step === 1) {
      if (!formData.crop) return t('crop_required');
      if (!farmDistrict) return t('district_required');
      if (!formData.harvest_date) return t('harvest_required');
    }
    if (step === 2) {
      if (formData.temperature < 0 || formData.temperature > 60) return t('temp_range_error');
      if (formData.humidity < 0 || formData.humidity > 100) return t('humidity_range_error');
      if (!formData.road_condition) return t('road_required');
    }
    if (step === 3) {
      if (Number(formData.quantity_tons) <= 0) return t('quantity_required');
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(currentStep);
    if (err) {
      setError(err);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleReset = () => {
    stopAnimation();
    setPredictionResult(null);
    setLoading(false);
    setCurrentStep(1);
    setError(null);
    setQualityResult(null);
    setImagePreview(null);
    handleChange('image_data', null);
    handleChange('picture_spoilage_prob', null);
    setAdvisoryData(null);
    setAudioBlobUrl((prevUrl) => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return null;
    });
  };

  const handleFetchWeather = async () => {
    setWeatherData(null);
    if (!farmDistrict) {
      setWeatherError(t('weather_profile_error'));
      return;
    }
    try {
      setLoadingWeather(true);
      setWeatherError(null);
      const res = await predictionsApi.getWeather(farmDistrict);
      const w = res.data;
      if (w.district !== farmDistrict || !Number.isFinite(w.temperature) || !Number.isFinite(w.humidity) || !Number.isFinite(w.wind_speed) || !w.description) {
        throw new Error(t('weather_incomplete'));
      }
      setWeatherData(w);
      handleChange('temperature', Number(w.temperature.toFixed(1)));
      handleChange('humidity', Number(w.humidity.toFixed(0)));
    } catch (err) {
      setWeatherError(err.response?.data?.detail || err.message || t('weather_retry'));
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleAnalyzeQuality = async () => {
    if (!formData.image_data) {
      setQualityError(t('photo_required'));
      return;
    }
    try {
      setAnalyzingQuality(true);
      setQualityError(null);
      const res = await predictionsApi.checkImageQuality(formData.image_data);
      const q = res.data;
      setQualityResult(q);
      if (q.picture_spoilage_prob !== undefined && q.picture_spoilage_prob !== null) {
        handleChange('picture_spoilage_prob', Number(q.picture_spoilage_prob.toFixed(4)));
      }
    } catch (err) {
      setQualityError(err.response?.data?.detail || t('quality_failed'));
    } finally {
      setAnalyzingQuality(false);
    }
  };

  const handleGenerateAdvisory = async () => {
    if (!predictionResult) return;
    try {
      setGeneratingAdvisory(true);
      setAdvisoryError(null);
      setAudioBlobUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return null;
      });
      const payload = {
        crop: predictionResult.crop,
        district: predictionResult.district,
        temperature: predictionResult.temperature,
        humidity: predictionResult.humidity,
        road_condition: predictionResult.road_condition,
        storage_days: predictionResult.storage_days,
        quantity_tons: predictionResult.quantity_tons,
        actual_transit_days: predictionResult.actual_transit_days,
        expected_transit_days: predictionResult.expected_transit_days,
        spoilage_probability: predictionResult.spoilage_probability,
        shelf_life_days: predictionResult.shelf_life_days,
        loss_percentage: predictionResult.loss_percentage,
        financial_loss: predictionResult.financial_loss,
        mandi_price_per_kg: predictionResult.mandi_price_per_kg,
        recommended_facility: predictionResult.recommended_facility,
        quality: qualityResult?.quality || null,
        quality_confidence: qualityResult?.confidence != null ? Number(qualityResult.confidence) : null,
        fresh_pct: qualityResult?.fresh_pct != null ? Number(qualityResult.fresh_pct) : null,
        rotten_pct: qualityResult?.rotten_pct != null ? Number(qualityResult.rotten_pct) : null,
        language: advisoryLanguage,
      };
      const res = await predictionsApi.getAdvisory(payload);
      setAdvisoryData(res.data);
    } catch (err) {
      setAdvisoryError(err.response?.data?.detail || t('failed_advisory'));
    } finally {
      setGeneratingAdvisory(false);
    }
  };

  const handleAdvisoryLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
    setAdvisoryData(null);
    setAudioBlobUrl((prevUrl) => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return null;
    });
    setAdvisoryError(null);
  };

  const handleFetchTTS = async (textToSpeak) => {
    if (!textToSpeak) return;
    if (advisoryData?.language !== advisoryLanguage) {
      setAudioError(t('audio_regenerate'));
      return;
    }
    try {
      setLoadingAudio(true);
      setAudioError(null);
      const res = await predictionsApi.getTTS(textToSpeak, advisoryLanguage);
      const url = URL.createObjectURL(res.data);
      setAudioBlobUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return url;
      });
    } catch (err) {
      setAudioError('Failed to generate speech audio stream.');
    } finally {
      setLoadingAudio(false);
    }
  };

  // Submit ML Prediction Request
  const handleSubmitPrediction = async () => {
    const err = validateStep(3);
    if (err) {
      setError(err);
      return;
    }

    if (!qualityResult) {
      setError(t('photo_required') || 'Vegetable Quality Analysis is required before calculating spoilage risk. Please upload and analyze a produce sample photo.');
      return;
    }

    try {
      setError(null);
      setPredictionResult(null);
      setLoading(true);
      startAnimation();

      const payload = {
        crop: String(formData.crop),
        temperature: Number(formData.temperature),
        humidity: Number(formData.humidity),
        road_condition: String(formData.road_condition),
        storage_days: Number(computedStorageDays),
        quantity_tons: Number(formData.quantity_tons),

        actual_transit_days: Number(formData.actual_transit_days || 3.0),
        expected_transit_days: Number(formData.expected_transit_days || 1.5),
        arrival_volume: Number(formData.arrival_volume || 180.0),
        avg_market_volume: Number(formData.avg_market_volume || 90.0),
        facility_distance_km: Number(computedDistanceKm),

        recommended_facility: formData.recommended_facility || null,
        picture_spoilage_prob: null,
        image_data: null,
      };

      const response = await predictionsApi.createPrediction(payload);
      stopAnimation();
      setPredictionResult(response.data);
      setLoading(false);
    } catch (apiErr) {
      stopAnimation();
      setLoading(false);
      setPredictionResult(null);
      const msg = getErrorMessage(apiErr);
      setError(`${t('prediction_failed')}: ${msg}`);
    }
  };

  const stepTitles = [
    { num: 1, label: t('crop_step'), icon: Sprout },
    { num: 2, label: t('ambient_climate'), icon: Thermometer },
    { num: 3, label: t('quantity_step'), icon: Boxes },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={t('new_prediction')}
        subtitle={t('prediction_subtitle')}
      />

      {/* Render Results Dashboard or Live Calculation Mode */}
      {(predictionResult || loading) ? (
        <div className="space-y-6">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-subtle relative overflow-hidden">
            {/* Top Results Header with Accurate Timing Banner (Only shown once prediction arrives) */}
            {predictionResult && (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-100 pb-6 mb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold uppercase tracking-wider">
                      {predictionResult.crop} • {t('analysis_complete')}
                    </span>
                    <RiskBadge risk={predictionResult.risk_level} />
                    <span className="px-3 py-1 rounded-full bg-[#DDF3E4] text-[#075C36] border border-[#087443]/30 text-xs font-bold tracking-tight">
                      {formatPercentage(predictionResult.spoilage_probability * 100, 1)} Spoilage Risk
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-stone-900 tracking-tight">
                    {t('prediction_result')}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-1.5">
                    <span className="flex items-center gap-1 font-medium text-stone-700">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      {predictionResult.district} District
                    </span>
                    <span>•</span>
                    <span>Quantity: <strong className="text-stone-800">{predictionResult.quantity_tons} MT</strong></span>
                    <span>•</span>
                    {/* Verified & User-friendly Prediction Timing */}
                    <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/80 font-medium">
                      <Clock className="w-3.5 h-3.5 text-emerald-700" />
                      Predicted: {formatDate(predictionResult.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  <Button variant="outline" onClick={handleReset} size="sm">
                    <RotateCcw className="w-4 h-4 mr-1.5 text-stone-500" />
                    {t('analyze_another')}
                  </Button>
                  <Button variant="primary" onClick={() => navigate('/farmer/predictions')} size="sm">
                    <History className="w-4 h-4 mr-1.5" />
                    {t('view_history')}
                  </Button>
                </div>
              </div>
            )}

            {/* Clear Timing & Dispatch Window Highlight Box (Only rendered on real result) */}
            {predictionResult && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-stone-900 text-sm block">
                      Dispatch Window: Safe for {predictionResult.shelf_life_days.toFixed(1)} Days
                    </span>
                    <span className="text-stone-600 block mt-0.5">
                      {calculateSafeUntilDate(predictionResult.created_at, predictionResult.shelf_life_days)
                        ? `Recommended to dispatch before: ${calculateSafeUntilDate(predictionResult.created_at, predictionResult.shelf_life_days)}`
                        : `Elapsed since harvest: ${computedStorageDays} days`}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold bg-white px-2.5 py-1 rounded-lg border border-amber-200 text-amber-800 self-start sm:self-auto shrink-0 shadow-2xs">
                  {computedStorageDays} Days in Farm Storage
                </span>
              </div>
            )}

            {/* Compact Read-Only Quality Summary (Persisted from Pre-Prediction Step) */}
            {predictionResult && qualityResult && (
              <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 shadow-2xs">
                <div className="flex items-center space-x-3">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Inspected Produce Sample"
                      className="w-12 h-12 rounded-xl object-cover border border-stone-200 shadow-2xs shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5 text-emerald-700" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">Visual Produce Inspection: {qualityResult.crop}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          qualityResult.quality === 'Fresh'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {qualityResult.quality}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200/70 text-stone-700 font-mono font-semibold">
                        MobileNetV2
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Confidence: <strong className="text-stone-700 font-semibold">{qualityResult.confidence}%</strong> • Freshness Index: <strong className="text-emerald-700 font-semibold">{qualityResult.fresh_pct}%</strong> • Surface Defects: <strong className="text-rose-700 font-semibold">{qualityResult.rotten_pct}%</strong>
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg self-start sm:self-auto shrink-0">
                  Verified Pre-Prediction
                </span>
              </div>
            )}

            {/* KPI Metrics Grid - Always visible during loading & with results */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
              <MetricCard
                title={t('spoilage_risk')}
                value={loading ? animatedValues.spoilage : formatPercentage(predictionResult.spoilage_probability * 100, 1)}
                subtext={loading ? null : `Status: ${predictionResult.risk_level}`}
                icon={ShieldAlert}
                color={predictionResult ? (predictionResult.risk_level === 'HIGH' ? 'danger' : predictionResult.risk_level === 'MEDIUM' ? 'accent' : 'primary') : 'primary'}
              />
              <MetricCard
                title={t('model_confidence')}
                value={loading ? animatedValues.confidence : formatPercentage(predictionResult.confidence, 1)}
                subtext={loading ? null : t('classifier_confidence')}
                icon={CheckCircle2}
                color="primary"
              />
              <MetricCard
                title={t('projected_loss')}
                value={loading ? animatedValues.loss : formatPercentage(predictionResult.loss_percentage, 1)}
                subtext={loading ? null : `~${((predictionResult.loss_percentage * predictionResult.quantity_tons) / 100).toFixed(2)} MT spoilage`}
                icon={TrendingDown}
                color="accent"
              />
              <MetricCard
                title={t('remaining_shelf_life')}
                value={loading ? animatedValues.shelf : `${predictionResult.shelf_life_days.toFixed(1)} Days`}
                subtext={loading ? null : t('dispatch_window')}
                icon={Sprout}
                color="primary"
              />
              <MetricCard
                title={t('financial_impact')}
                value={loading ? animatedValues.impact : formatCurrency(predictionResult.financial_loss)}
                subtext={loading ? null : `Mandi: ₹${predictionResult.mandi_price_per_kg || 25}/kg`}
                icon={Warehouse}
                color="accent"
              />
            </div>

            {/* Recommended Cold Storage Callout */}
            {predictionResult && predictionResult.recommended_facility && predictionResult.recommended_facility !== 'Optimized Facility' && (
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-900 text-sm flex items-start space-x-3 mb-6 shadow-2xs">
                <Warehouse className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-900">{t('recommended_storage')}</p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {t('facility_label')}: <span className="font-semibold text-emerald-900">{predictionResult.recommended_facility}</span>
                    {predictionResult.facility_distance_km != null && (
                      <span> • {t('distance')}: <span className="font-semibold text-emerald-900">{predictionResult.facility_distance_km.toFixed(1)} km</span></span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* GenAI Agronomist Spoilage Advisory & Spoken Audio Section */}
            {predictionResult && (
              <div className="p-6 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-stone-900">
                      {t('advisory_title')}
                    </h4>
                    <p className="text-xs text-stone-500">
                      {t('advisory_subtitle')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center bg-white border border-stone-200 rounded-xl p-1 text-xs shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleAdvisoryLanguageChange('en')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        advisoryLanguage === 'en'
                          ? 'bg-emerald-800 text-white font-bold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdvisoryLanguageChange('hi')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        advisoryLanguage === 'hi'
                          ? 'bg-emerald-800 text-white font-bold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      हिन्दी
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdvisoryLanguageChange('kn')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        advisoryLanguage === 'kn'
                          ? 'bg-emerald-800 text-white font-bold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      ಕನ್ನಡ
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateAdvisory}
                    isLoading={generatingAdvisory}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    {advisoryData ? t('regenerate_advisory') : t('generate_advisory')}
                  </Button>
                </div>
              </div>

              {advisoryError && (
                <p className="text-xs text-rose-600 font-medium">{advisoryError}</p>
              )}

              {generatingAdvisory && (
                <div className="py-6 text-center text-xs text-stone-500">
                  <Sparkles className="w-5 h-5 text-emerald-700 animate-spin mx-auto mb-2" />
                  {t('generating')}
                </div>
              )}

              {advisoryData && (
                <div className="space-y-4">
                  {advisoryData.language !== advisoryLanguage && (
                    <p role="status" className="text-xs text-amber-800 font-medium">{t('selected_language_changed')}</p>
                  )}
                  {/* Spoken Broadcast Player */}
                  <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-800">
                        <Volume2 className="w-4 h-4 text-emerald-700" />
                        <span>{t('audio_player')} ({({ en: 'English', hi: 'हिन्दी', kn: 'ಕನ್ನಡ' })[advisoryLanguage]})</span>
                      </div>
                      {!audioBlobUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleFetchTTS(advisoryData.spoken_advisory)}
                          isLoading={loadingAudio}
                        >
                          <Play className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                          {t('listen_advisory')}
                        </Button>
                      )}
                    </div>

                    {audioError && <p className="text-xs text-rose-600">{audioError}</p>}

                    {audioBlobUrl && (
                      <div className="pt-2">
                        <audio controls autoPlay className="w-full h-10 rounded-lg">
                          <source src={audioBlobUrl} type="audio/mpeg" />
                          {t('audio_unsupported')}
                        </audio>
                      </div>
                    )}
                  </div>

                  {/* 5 Structured Directives Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-1 shadow-2xs">
                      <span className="font-bold text-emerald-800 block text-xs">1. {t('diagnosis')}</span>
                      <p className="text-stone-700 leading-relaxed">{advisoryData.diagnosis}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/90 space-y-1 shadow-2xs">
                      <span className="font-bold text-emerald-900 block text-xs">2. {t('priority_action')}</span>
                      <p className="text-emerald-950 leading-relaxed font-medium">{advisoryData.priority_action}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-1 shadow-2xs">
                      <span className="font-bold text-sky-800 block text-xs">3. {t('storage_protocols')}</span>
                      <p className="text-stone-700 leading-relaxed">{advisoryData.storage_protocols}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-1 shadow-2xs">
                      <span className="font-bold text-amber-800 block text-xs">4. {t('route_logistics')}</span>
                      <p className="text-stone-700 leading-relaxed">{advisoryData.route_logistics}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-1 text-xs shadow-2xs">
                    <span className="font-bold text-purple-900 block text-xs">5. {t('economic_decision')}</span>
                    <p className="text-purple-950 leading-relaxed">{advisoryData.economic_decision}</p>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>

          {predictionResult && (
            <OptimalRouteLogisticsPanel
              predictionResult={predictionResult}
              onPredictionUpdate={setPredictionResult}
              warehouses={warehouses}
              formContext={{
                crop: formData.crop,
                district: farmDistrict,
                temperature: formData.temperature,
                humidity: formData.humidity,
                road_condition: formData.road_condition,
                storage_days: computedStorageDays,
                quantity_tons: formData.quantity_tons,
                actual_transit_days: formData.actual_transit_days,
                expected_transit_days: formData.expected_transit_days,
                arrival_volume: formData.arrival_volume,
                avg_market_volume: formData.avg_market_volume,
                picture_spoilage_prob: formData.picture_spoilage_prob,
                image_data: formData.image_data,
              }}
            />
          )}
        </div>
      ) : (
        /* Render Prediction Wizard */
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-subtle">
          {/* Stepper Progress Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              <span>{t('step')} {currentStep} {t('of')} 3</span>
              <span className="text-emerald-800 font-bold">{Math.round((currentStep / 3) * 100)}% {t('complete')}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full bg-emerald-700 transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>

            {/* Stepper Tabs Bar (3 Steps) */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              {stepTitles.map((st) => {
                const Icon = st.icon;
                const active = currentStep === st.num;
                const completed = currentStep > st.num;
                return (
                  <button
                    key={st.num}
                    onClick={() => {
                      if (st.num < currentStep) setCurrentStep(st.num);
                    }}
                    disabled={st.num > currentStep || loading}
                    className={`flex flex-col items-center p-2.5 rounded-xl text-center transition-all ${
                      active
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                        : completed
                        ? 'bg-stone-50 text-emerald-800 border border-stone-200 cursor-pointer hover:bg-stone-100'
                        : 'bg-stone-50/50 text-stone-400 border border-transparent cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-4 h-4" />
                      {completed && <Check className="w-3 h-3 text-emerald-700 font-bold" />}
                    </div>
                    <span className="text-[11px] hidden md:inline truncate w-full">{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice Input Banner */}
          {isListening && (
            <div className="mb-6 p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center justify-between animate-pulse">
              <span className="flex items-center font-medium">
                <Mic className="w-4 h-4 mr-2 text-sky-700 animate-bounce" />
                {t('voice_prompt')} (e.g. "Potato", "Tomato", "Onion", "Cucumber")
              </span>
              <span className="font-mono text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-semibold">{t('voice_dictation')}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-stone-900">{t('validation_notice')}</p>
                <p className="text-xs text-rose-700 mt-0.5 font-medium">{error}</p>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* STEP 1 — CROP & HARVEST DATE */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                        <Sprout className="w-5 h-5 text-emerald-800" />
                        <span>1. {t('crop_step')}</span>
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {t('select_crop_harvest')}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startVoiceInput('crop')}
                    >
                      <Mic className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                      {t('voice_dictation')}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label={t('crop_label')}
                      value={formData.crop}
                      onChange={(e) => handleChange('crop', e.target.value)}
                      options={CROP_LIST.map((c) => ({ value: c, label: c }))}
                      required
                    />

                      <div className="space-y-1.5">
                        <span className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                          {t('registered_district')}
                        </span>
                        <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 font-medium">
                          <MapPin className="h-4 w-4 text-emerald-700" />
                          {farmDistrict || 'Set your farm district in your profile'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Integrated DatePicker with Calendar Selection & Quick Chips */}
                      <div>
                        <DatePicker
                          label={t('harvest_date')}
                          value={formData.harvest_date}
                          onChange={(e) => handleChange('harvest_date', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          required
                          helperText={formData.harvest_date === new Date().toISOString().split('T')[0] ? 'Harvest scheduled for today' : 'Upcoming harvest schedule'}
                        />
                      </div>

                      <Input
                        label={t('target_facility')}
                        placeholder={t('auto_match_placeholder')}
                        value={formData.recommended_facility}
                        onChange={(e) => handleChange('recommended_facility', e.target.value)}
                        helperText={t('nearest_facility_auto')}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2 — ENVIRONMENT & ROAD INFRASTRUCTURE */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    <div className="border-b border-stone-100 pb-3">
                      <h4 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                        <Thermometer className="w-5 h-5 text-emerald-800" />
                        <span>{t('step_environment')}</span>
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Input storage temperature, humidity baseline, and transit road quality
                      </p>
                    </div>

                    {/* Live District Weather Telemetry Banner */}
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-2.5">
                        <div className="flex items-center space-x-2">
                          <CloudSun className="w-4 h-4 text-emerald-700" />
                          <span className="text-xs font-bold text-stone-900">{t('live_weather')}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
                            {weatherData?.live ? 'OpenWeatherMap Live' : 'District Station'}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleFetchWeather}
                          isLoading={loadingWeather}
                        >
                          <Radio className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                          {t('fetch_weather')} ({farmDistrict})
                        </Button>
                      </div>

                      {weatherError && (
                        <p role="alert" className="text-xs text-rose-600 font-medium">{t('weather_unavailable')}: {weatherError}</p>
                      )}

                      {!weatherData && !weatherError && !loadingWeather && (
                        <p className="text-xs text-stone-500">{t('weather_unloaded')} {farmDistrict}</p>
                      )}

                      {weatherData && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                          <div className="p-2.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
                            <span className="text-stone-500 block text-[11px]">{t('temperature')}</span>
                            <span className="text-stone-900 font-bold text-sm">{weatherData.temperature.toFixed(1)}°C</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
                            <span className="text-stone-500 block text-[11px]">{t('humidity')}</span>
                            <span className="text-stone-900 font-bold text-sm">{weatherData.humidity}%</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
                            <span className="text-stone-500 block text-[11px]">{t('wind_velocity')}</span>
                            <span className="text-stone-900 font-bold text-sm">{weatherData.wind_speed} km/h</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
                            <span className="text-stone-500 block text-[11px]">{t('condition')}</span>
                            <span className="text-emerald-800 font-semibold text-xs truncate capitalize block">{weatherData.description}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={t('storage_temperature')}
                        type="number"
                        step="0.5"
                        min="0"
                        max="60"
                        value={formData.temperature}
                        onChange={(e) => handleChange('temperature', parseFloat(e.target.value) || 0)}
                        helperText={t('temperature_help')}
                        required
                      />

                      <Input
                        label={t('humidity_label')}
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={formData.humidity}
                        onChange={(e) => handleChange('humidity', parseFloat(e.target.value) || 0)}
                        helperText={t('humidity_help')}
                        required
                      />
                    </div>

                    <Select
                      label={t('road_quality')}
                      value={formData.road_condition}
                      onChange={(e) => handleChange('road_condition', e.target.value)}
                      options={ROAD_QUALITY_OPTIONS.map((r) => ({ value: r, label: r }))}
                      required
                    />
                  </div>
                )}

                {/* STEP 3 — HARVEST QUANTITY & AUTO-LOGISTICS SUMMARY */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    <div className="border-b border-stone-100 pb-3">
                      <h4 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                        <Boxes className="w-5 h-5 text-emerald-800" />
                        <span>{t('quantity_step')}</span>
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Specify harvest tonnage. Transport logistics & distances are calculated automatically.
                      </p>
                    </div>

                    <Input
                      label={t('harvest_quantity')}
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={formData.quantity_tons}
                      onChange={(e) => handleChange('quantity_tons', parseFloat(e.target.value) || 0)}
                      helperText={t('quantity_help')}
                      required
                    />

                    {/* Auto-Calculated Logistics Preview */}
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3 text-xs">
                      <div className="flex items-center justify-between text-stone-800 font-semibold border-b border-stone-200 pb-2">
                        <span>{t('telemetry_benchmarks')}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">{t('auto_calculated')}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-stone-500">
                        <div>{t('elapsed_storage')}: <strong className="text-stone-900 font-semibold">{computedStorageDays} {t('days')}</strong></div>
                        <div>{t('estimated_distance')}: <strong className="text-stone-900 font-semibold">{computedDistanceKm == null ? t('unavailable') : `${computedDistanceKm} km`}</strong></div>
                        <div>{t('default_transit')}: <strong className="text-stone-900 font-semibold">{formData.actual_transit_days} / {formData.expected_transit_days} {t('days')}</strong></div>
                        <div>{t('market_benchmark')}: <strong className="text-stone-900 font-semibold">{formData.arrival_volume} / {formData.avg_market_volume} MT</strong></div>
                      </div>
                    </div>

                    {/* Collapsible Advanced Parameters Drawer */}
                    <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full p-3.5 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center">
                          <Sliders className="w-3.5 h-3.5 mr-2 text-emerald-700" />
                          {t('advanced_parameters')}
                        </span>
                        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
                      </button>

                      {showAdvanced && (
                        <div className="p-4 bg-white border-t border-stone-200 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                              label={t('actual_transit')}
                              type="number"
                              step="0.1"
                              value={formData.actual_transit_days}
                              onChange={(e) => handleChange('actual_transit_days', parseFloat(e.target.value) || 0)}
                            />
                            <Input
                              label={t('expected_transit')}
                              type="number"
                              step="0.1"
                              value={formData.expected_transit_days}
                              onChange={(e) => handleChange('expected_transit_days', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                              label={t('arrival_volume')}
                              type="number"
                              step="10"
                              value={formData.arrival_volume}
                              onChange={(e) => handleChange('arrival_volume', parseFloat(e.target.value) || 0)}
                            />
                            <Input
                              label={t('custom_distance')}
                              type="number"
                              placeholder={`Auto: ${computedDistanceKm} km`}
                              value={formData.custom_distance_km || ''}
                              onChange={(e) => handleChange('custom_distance_km', parseFloat(e.target.value) || null)}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* VEGETABLE QUALITY ANALYSIS (MobileNetV2) — Required Pre-Prediction Inspection */}
                    <div className="border border-stone-200 rounded-2xl p-5 bg-stone-50/50 space-y-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            <Camera className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-stone-900">
                                Vegetable Quality Analysis
                              </h5>
                              <span className="px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700 border border-stone-300 text-[10px] font-bold uppercase tracking-wider font-mono">
                                MobileNetV2
                              </span>
                              {qualityResult && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-700 font-bold" />
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">
                              Produce Sample Inspection (Prerequisite for Spoilage Risk Calculation)
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                          Required Prerequisite
                        </span>
                      </div>

                      {/* Explicit Distinction Note */}
                      <p className="text-xs text-stone-600 leading-relaxed bg-white p-3 rounded-xl border border-stone-200">
                        <strong className="text-stone-800 font-semibold">Inspection Note: </strong>
                        Upload a sample photograph of your {formData.crop} harvest to verify surface defects, decay, and physical freshness via MobileNetV2 before unlocking the biophysical risk calculation.
                      </p>

                      {/* Upload / Preview Card */}
                      <div className="border-2 border-dashed border-stone-300 hover:border-emerald-600 rounded-xl p-5 text-center transition-colors bg-white">
                        {imagePreview ? (
                          <div className="space-y-4">
                            <img
                              src={imagePreview}
                              alt={t('crop_sample_preview') || 'Produce Sample Preview'}
                              className="max-h-48 mx-auto rounded-xl border border-stone-200 shadow-sm object-contain"
                            />
                            <div className="flex items-center justify-center space-x-3">
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={handleAnalyzeQuality}
                                isLoading={analyzingQuality}
                              >
                                <Sparkles className="w-3.5 h-3.5 mr-1" />
                                {qualityResult ? 'Re-analyze Sample' : `${t('analyze_quality')} (MobileNetV2)`}
                              </Button>
                              <button
                                type="button"
                                onClick={() => {
                                  setImagePreview(null);
                                  handleChange('image_data', null);
                                  handleChange('picture_spoilage_prob', null);
                                  setQualityResult(null);
                                  setQualityError(null);
                                }}
                                className="text-xs font-semibold text-rose-600 hover:underline px-2 py-1"
                              >
                                {t('remove_image') || 'Remove Image'}
                              </button>
                            </div>

                            {qualityError && (
                              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left">
                                {qualityError}
                              </div>
                            )}

                            {/* Quality Analysis Results Display */}
                            {qualityResult && (
                              <div className="mt-3 p-4 rounded-xl bg-stone-50 border border-stone-200 text-left space-y-3.5 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold text-stone-900">{t('visual_assessment') || 'Visual Assessment'}:</span>
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-white text-stone-700 font-mono font-bold capitalize border border-stone-200">
                                      {qualityResult.crop}
                                    </span>
                                  </div>
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                      qualityResult.quality === 'Fresh'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                                    }`}
                                  >
                                    {qualityResult.quality}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                                    <span className="text-stone-500 block text-[11px] font-medium">{t('model_confidence')}</span>
                                    <span className="text-stone-900 font-extrabold text-base">{qualityResult.confidence}%</span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                                    <span className="text-stone-500 block text-[11px] font-medium">Visual Defect Factor</span>
                                    <span className="text-emerald-800 font-extrabold text-base font-mono">
                                      {(qualityResult.picture_spoilage_prob * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                </div>

                                {/* Fresh vs Rotten Progress Bars */}
                                <div className="space-y-2 pt-1">
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-stone-600 font-medium">{t('fresh_score') || 'Freshness Index'}</span>
                                    <span className="text-emerald-800 font-bold">{qualityResult.fresh_pct}%</span>
                                  </div>
                                  <div className="w-full bg-stone-200/80 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                      style={{ width: `${qualityResult.fresh_pct}%` }}
                                    />
                                  </div>

                                  <div className="flex justify-between text-[11px] pt-0.5">
                                    <span className="text-stone-600 font-medium">{t('rotten_score') || 'Surface Defect Index'}</span>
                                    <span className="text-rose-700 font-bold">{qualityResult.rotten_pct}%</span>
                                  </div>
                                  <div className="w-full bg-stone-200/80 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                                      style={{ width: `${qualityResult.rotten_pct}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Ready Banner */}
                                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center space-x-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                                  <span>Quality analysis complete. Spoilage risk calculation is now enabled below.</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <label className="cursor-pointer space-y-2 block py-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                              <Camera className="w-6 h-6" />
                            </div>
                            <span className="block text-sm font-semibold text-stone-900">
                              {t('upload_sample') || 'Upload Produce Sample Photograph'}
                            </span>
                            <span className="block text-xs text-stone-500 max-w-sm mx-auto">
                              {t('image_formats') || 'JPEG, PNG or WEBP up to 5MB for visual freshness verification'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Wizard Navigation */}
                <div className="pt-6 border-t border-stone-100 flex items-center justify-between">
                  {currentStep > 1 ? (
                    <Button variant="outline" onClick={handleBack} disabled={loading}>
                      <ArrowLeft className="w-4 h-4 mr-1.5" />
                      {t('back')}
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={() => navigate('/farmer/dashboard')} disabled={loading}>
                      {t('cancel')}
                    </Button>
                  )}

                  {currentStep < 3 ? (
                    <Button variant="primary" onClick={handleNext}>
                      {t('next')}
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                      {!qualityResult && (
                        <span className="inline-flex items-center text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl shadow-2xs">
                          <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" />
                          Complete quality analysis above to calculate risk
                        </span>
                      )}
                      <Button
                        variant="primary"
                        onClick={handleSubmitPrediction}
                        disabled={!qualityResult || loading}
                        isLoading={loading}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Calculate Spoilage & Risk
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
        </div>
      )}
    </div>
  );
}
