// pages/dr/DrForm.tsx

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  createSubmission,
  updateSubmission,
  getSubmissionById,
  clearError,
  clearCurrentSubmission,
  type PendingProceedingItem,
  type SubmissionStatus,
  type StationRequirementSubmission,
} from '../../store/slices/formBuilderSlice';
import type { AppDispatch, RootState } from '../../store/store';

// Define categories directly in the component
const PENDING_PROCEEDINGS_CATEGORIES = {
  "Pending Proceedings to Court of Appeal": [
    "Civil",
    "Criminal",
    "Succession"
  ],
  "Pending Proceedings from Subordinate Courts": [
    "Civil",
    "Criminal",
    "Succession"
  ]
} as const;

interface FormData {
  station: string;
  status: SubmissionStatus;
}

// Category values: { [category]: { [itemName]: quantity } }
type CategoryValues = Record<string, Record<string, number>>;

// ============================================================
// Helper to build initial values from categories
// ============================================================
const buildInitialValues = (categories: string[]): CategoryValues => {
  const initial: CategoryValues = {};
  categories.forEach((category) => {
    initial[category] = {};
  });
  return initial;
};

// ============================================================
// Helper to populate form from existing submission
// ============================================================
const populateFromSubmission = (
  submission: StationRequirementSubmission | null,
  categories: string[]
): { courtOfAppealValues: CategoryValues; subordinateCourtsValues: CategoryValues } => {
  const courtOfAppealValues = buildInitialValues(categories);
  const subordinateCourtsValues = buildInitialValues(categories);

  if (!submission) return { courtOfAppealValues, subordinateCourtsValues };

  // ✅ Normalize division names
  const normalizeDivision = (division: string): string => {
    if (division === 'Pending Proceedings to Subordinate Courts') {
      return 'Pending Proceedings from Subordinate Courts';
    }
    return division;
  };

  // Populate Court of Appeal
  submission.courtOfAppeal.forEach((item) => {
    const normalizedDivision = normalizeDivision(item.division);
    if (courtOfAppealValues[normalizedDivision] && courtOfAppealValues[normalizedDivision][item.name] !== undefined) {
      courtOfAppealValues[normalizedDivision][item.name] = item.quantity;
    }
  });

  // Populate Subordinate Courts
  submission.subordinateCourts.forEach((item) => {
    const normalizedDivision = normalizeDivision(item.division);
    if (subordinateCourtsValues[normalizedDivision] && subordinateCourtsValues[normalizedDivision][item.name] !== undefined) {
      subordinateCourtsValues[normalizedDivision][item.name] = item.quantity;
    }
  });

  return { courtOfAppealValues, subordinateCourtsValues };
};

const calculateTotal = (values: CategoryValues): number => {
  return Object.values(values).reduce(
    (sum, items) => sum + Object.values(items).reduce((s, v) => s + v, 0),
    0
  );
};

const collectItems = (values: CategoryValues): PendingProceedingItem[] => {
  const items: PendingProceedingItem[] = [];
  Object.entries(values).forEach(([division, cases]) => {
    // ✅ Normalize the division name
    const normalizedDivision = division === 'Pending Proceedings to Subordinate Courts' 
      ? 'Pending Proceedings from Subordinate Courts' 
      : division;
      
    Object.entries(cases).forEach(([name, quantity]) => {
      if (quantity > 0) {
        items.push({ 
          division: normalizedDivision,
          name, 
          quantity 
        });
      }
    });
  });
  return items;
};

interface DrFormProps {
  editMode?: boolean;
  submissionId?: string;
  initialSubmission?: StationRequirementSubmission | null;
  onSubmitted?: () => void;
  loadDraftId?: string;
  onDraftLoaded?: (submission: StationRequirementSubmission) => void;
}

// ✅ Type for collected form data
interface CollectedData {
  station: string;
  courtOfAppeal: PendingProceedingItem[];
  subordinateCourts: PendingProceedingItem[];
}

const DrForm: React.FC<DrFormProps> = ({
  editMode = false,
  submissionId,
  initialSubmission = null,
  onSubmitted,
  loadDraftId,
  onDraftLoaded,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    isSubmitting,
    error,
    currentSubmission,
  } = useSelector(
    (state: RootState) => state.pendingProceedings
  );
  const { user, accessToken, isInitializing } = useSelector((state: RootState) => state.auth);

  const userStation = user?.station || '';

  // Step management: 1 = Court of Appeal, 2 = Subordinate Courts
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [formData, setFormData] = useState<FormData>({
    station: userStation,
    status: 'submitted',
  });

  // Use static categories
  const categories = Object.keys(PENDING_PROCEEDINGS_CATEGORIES).map((key) => ({
    category: key,
    items: PENDING_PROCEEDINGS_CATEGORIES[key as keyof typeof PENDING_PROCEEDINGS_CATEGORIES],
  }));

  // Get category names from static categories
  const categoryNames = categories.map(c => c.category);
  const courtOfAppealCategory = 'Pending Proceedings to Court of Appeal';
  const subordinateCourtsCategory = 'Pending Proceedings from Subordinate Courts';

  // Initialize state based on whether we're in edit mode
  const getInitialValues = (): { courtOfAppealValues: CategoryValues; subordinateCourtsValues: CategoryValues } => {
    if (editMode && (initialSubmission || currentSubmission)) {
      const submission = initialSubmission || currentSubmission;
      return populateFromSubmission(submission, categoryNames);
    }
    return { 
      courtOfAppealValues: buildInitialValues([courtOfAppealCategory]),
      subordinateCourtsValues: buildInitialValues([subordinateCourtsCategory])
    };
  };

  const initialValues = getInitialValues();
  const [courtOfAppealValues, setCourtOfAppealValues] = useState<CategoryValues>(initialValues.courtOfAppealValues);
  const [subordinateCourtsValues, setSubordinateCourtsValues] = useState<CategoryValues>(initialValues.subordinateCourtsValues);

  const [isEditing, setIsEditing] = useState(editMode);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [syncedId, setSyncedId] = useState<string | undefined>(
    editMode ? submissionId : undefined
  );

  // ✅ Nil Return confirmation dialog state
  const [showNilConfirmDialog, setShowNilConfirmDialog] = useState(false);

  // Load draft when loadDraftId is provided
  useEffect(() => {
    if (loadDraftId && accessToken && !isInitializing) {
      const loadDraft = async () => {
        setIsLoadingDraft(true);
        try {
          const result = await dispatch(getSubmissionById(loadDraftId)).unwrap();
          const submission = result.submission;
          
          if (submission.status !== 'submitted') {
            toast.error('This submission has already been submitted and cannot be edited.');
            setIsSubmitted(true);
            setIsLoadingDraft(false);
            return;
          }

          setFormData({
            station: submission.station,
            status: submission.status,
          });
          
          const { courtOfAppealValues: coaValues, subordinateCourtsValues: subValues } = 
            populateFromSubmission(submission, categoryNames);
          setCourtOfAppealValues(coaValues);
          setSubordinateCourtsValues(subValues);
          setIsEditing(true);
          setSyncedId(loadDraftId);
          setIsSubmitted(false);
          
          if (onDraftLoaded) {
            onDraftLoaded(submission);
          }
          
          toast.success('Draft loaded successfully');
        } catch (err) {
          console.error('❌ Failed to load draft:', err);
          toast.error('Failed to load draft. Please try again.');
        } finally {
          setIsLoadingDraft(false);
        }
      };
      
      loadDraft();
    }
  }, [loadDraftId, accessToken, isInitializing, dispatch, onDraftLoaded, categoryNames]);

  // Sync form state from initialSubmission/currentSubmission
  if (editMode && submissionId !== syncedId && !loadDraftId) {
    const submission = initialSubmission ?? currentSubmission;
    if (submission) {
      setSyncedId(submissionId);
      setFormData({
        station: submission.station,
        status: submission.status,
      });
      const { courtOfAppealValues: coaValues, subordinateCourtsValues: subValues } =
        populateFromSubmission(submission, categoryNames);
      setCourtOfAppealValues(coaValues);
      setSubordinateCourtsValues(subValues);
      setIsEditing(true);
      if (submission.status === 'submitted') {
        setIsSubmitted(true);
      }
    }
  }

  useEffect(() => {
    return () => {
      dispatch(clearError());
      if (!editMode && !loadDraftId) {
        dispatch(clearCurrentSubmission());
      }
    };
  }, [dispatch, editMode, loadDraftId]);

  // Show error toast when redux error changes
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleCourtOfAppealChange = (division: string, name: string, value: number): void => {
    if (isSubmitted) return;
    setCourtOfAppealValues((prev) => ({
      ...prev,
      [division]: { ...prev[division], [name]: Math.max(0, value) },
    }));
  };

  const handleSubordinateCourtsChange = (division: string, name: string, value: number): void => {
    if (isSubmitted) return;
    setSubordinateCourtsValues((prev) => ({
      ...prev,
      [division]: { ...prev[division], [name]: Math.max(0, value) },
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    if (isSubmitted) return;
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const collectData = (): CollectedData => {
    return {
      station: formData.station,
      courtOfAppeal: collectItems(courtOfAppealValues),
      subordinateCourts: collectItems(subordinateCourtsValues),
    };
  };

  const handleNextStep = (): void => {
    if (isSubmitted) return;
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = (): void => {
    if (isSubmitted) return;
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSubmitDraft = async (): Promise<void> => {
    setShowConfirmDialog(true);
  };

  const confirmSubmit = async (): Promise<void> => {
    setShowConfirmDialog(false);
    await handleSubmit();
  };

  const cancelSubmit = (): void => {
    setShowConfirmDialog(false);
  };

  // ✅ Extract submission logic to a separate function with proper typing
  const submitFormData = async (data: CollectedData): Promise<void> => {
    const loadingToast = toast.loading('Submitting...');

    console.log('📤 Submitting pending proceedings:', {
      station: data.station,
      courtOfAppeal: data.courtOfAppeal,
      subordinateCourts: data.subordinateCourts,
      isNilReturn: data.courtOfAppeal.length === 0 && data.subordinateCourts.length === 0,
    });

    try {
      let result;

      const existingId = submissionId || syncedId;
      
      if (isEditing && existingId) {
        const payload = {
          id: existingId,
          data: {
            station: data.station,
            courtOfAppeal: data.courtOfAppeal,
            subordinateCourts: data.subordinateCourts,
          }
        };
        result = await dispatch(updateSubmission(payload)).unwrap();
        toast.success('Submission updated successfully!', { id: loadingToast });
      } else {
        const payload = {
          station: data.station,
          courtOfAppeal: data.courtOfAppeal,
          subordinateCourts: data.subordinateCourts,
        };
        result = await dispatch(createSubmission(payload)).unwrap();
        toast.success('Submission created successfully!', { id: loadingToast });
      }

      console.log('✅ Submission successful:', result);

      setIsSubmitted(true);
      setFormData(prev => ({ ...prev, status: 'submitted' }));

      if (onSubmitted) {
        onSubmitted();
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save submission. Please try again.';
      console.error('❌ Submission error:', err);
      toast.error(errorMsg, { id: loadingToast });
    }
  };

  // ✅ Updated handleSubmit to allow nil returns
  const handleSubmit = async (): Promise<void> => {
    if (isSubmitted) {
      toast.error('This submission has already been submitted and cannot be modified.');
      return;
    }

    if (!formData.station.trim()) {
      toast.error('Please enter a station name.');
      return;
    }

    const data = collectData();
    const hasCourtOfAppeal = data.courtOfAppeal.length > 0;
    const hasSubordinateCourts = data.subordinateCourts.length > 0;

    // ✅ Allow nil returns (all zeros)
    if (!hasCourtOfAppeal && !hasSubordinateCourts) {
      setShowNilConfirmDialog(true);
      return;
    }

    await submitFormData(data);
  };

  // ✅ Nil confirmation handlers
  const confirmNilSubmit = async (): Promise<void> => {
    setShowNilConfirmDialog(false);
    const data = collectData();
    await submitFormData(data);
  };

  const cancelNilSubmit = (): void => {
    setShowNilConfirmDialog(false);
  };

  // Render category section
  const renderCategorySection = (
    values: CategoryValues,
    onChange: (division: string, name: string, value: number) => void,
    prefix: string,
    total: number,
    title: string,
    categoriesList: string[]
  ): React.ReactElement => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-2 mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <span className="text-sm text-gray-600">{total} items</span>
        </div>

        {/* Column header */}
        <div className="hidden md:flex items-center px-4 py-2 text-xs uppercase tracking-wider text-gray-500 font-semibold">
          <div className="flex-1">Category</div>
          <div className="w-24 text-right">Quantity</div>
        </div>

        {categoriesList.map((division) => {
          const categoryData = categories.find(c => c.category === division);
          const items = categoryData?.items || [];

          if (items.length === 0) {
            return (
              <div key={division} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-emerald-100 px-4 py-2 font-semibold text-sm text-gray-800 uppercase">
                  {division}
                </div>
                <div className="px-4 py-4 text-sm text-gray-500 text-center">
                  No items available for this category
                </div>
              </div>
            );
          }

          return (
            <div key={division} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-emerald-100 px-4 py-2 font-semibold text-sm text-gray-800 uppercase">
                {division}
              </div>
              {items.map((item) => {
                const key = `${prefix}_${division}_${item}`;
                return (
                  <div
                    key={key}
                    className="flex flex-wrap md:flex-nowrap items-center gap-y-2 px-4 py-3 border-t border-gray-100"
                  >
                    <label htmlFor={key} className="flex-1 min-w-[140px] text-sm">
                      {item}
                    </label>
                    <input
                      id={key}
                      type="number"
                      min="0"
                      step="1"
                      value={values[division]?.[item] || 0}
                      onChange={(e) => onChange(division, item, parseInt(e.target.value, 10) || 0)}
                      className={`w-24 px-3 py-2 border border-gray-300 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isSubmitted ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="0"
                      disabled={isSubmitted}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="bg-gray-800 text-white rounded-lg p-4 flex justify-end">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-300">Total</div>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
          </div>
        </div>
      </div>
    );
  };

  if (isInitializing || isLoadingDraft) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto"></div>
          <p className="mt-4 text-gray-600">{isLoadingDraft ? 'Loading draft...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  const courtOfAppealTotal = calculateTotal(courtOfAppealValues);
  const subordinateCourtsTotal = calculateTotal(subordinateCourtsValues);
  const totalItems = courtOfAppealTotal + subordinateCourtsTotal;

  return (
    <div className="min-h-screen bg-[#f7f5f0] py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#12253d] to-[#1e3a5f] text-[#f3efe4] p-8 rounded-lg mb-8 border-b-4 border-[#a3782e]">
          <div className="text-xs uppercase tracking-widest text-[#c9b98a] mb-2">
            Data Collection · Pending Proceedings
          </div>
          <h1 className="text-2xl font-semibold mb-2 font-serif uppercase">
            {isSubmitted ? 'Submission Complete' : (isEditing ? 'Edit Submission' : 'Audit of Pending Requests for Typed Proceedings')}
          </h1>
          {isEditing && !isSubmitted && (
            <div className="text-sm text-[#c9b98a] mb-2">
              Editing submission for {currentSubmission?.station || formData.station}
            </div>
          )}
          {isSubmitted && (
            <div className="text-sm text-green-300 mb-2">
              ✓ This submission has been successfully submitted and is now locked.
            </div>
          )}
          {!isSubmitted && (
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-[#c9b98a]">
                Step {currentStep} of 2: {currentStep === 1 ? 'Court of Appeal' : 'Subordinate Courts'}
              </span>
              <div className="flex gap-2">
                <div className={`w-3 h-3 rounded-full ${currentStep === 1 ? 'bg-[#a3782e]' : 'bg-gray-500'}`} />
                <div className={`w-3 h-3 rounded-full ${currentStep === 2 ? 'bg-[#a3782e]' : 'bg-gray-500'}`} />
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        {!isSubmitted && (
          <div className="bg-white border border-gray-300 rounded-lg p-6 mb-8 text-sm text-gray-700 space-y-3">
            <p>
              Delay in the provision of typed proceedings has been identified as one of the major impediments to the expeditious determination of appeals, both in the Court of Appeal and in the High Court. To enable management develop targeted interventions to address this challenge, we intend to undertake an audit of cases where proceedings are yet to be supplied by the lower court for purposes of an appeal in the High Court, as well as cases where the High Court is yet to provide proceedings requested by the Court of Appeal.
            </p>
            <p>
              Kindly fill in the details below to facilitate the initial audit, indicating the number of cases in which typed proceedings remain outstanding.
            </p>
            <p>
              We would appreciate receiving the requested information by COB today to enable us forward the same in good time for the initial assessment and identification of appropriate interventions.
            </p>
            <p>
              We apologise for the short notice.
            </p>
            <p className="font-semibold">RHC</p>
          </div>
        )}

        {/* Station Info */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="station" className="block text-xs uppercase tracking-wider text-gray-600 mb-1">
                Station name
              </label>
              <input
                id="station"
                name="station"
                type="text"
                value={formData.station}
                onChange={handleInputChange}
                placeholder="e.g. Kisumu Law Courts"
                className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isSubmitted || !!user?.station || isEditing ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                disabled={isSubmitted || !!user?.station || isEditing}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-600 mb-1">
                Status
              </label>
              <div className={`w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700`}>
                {isSubmitted ? 'Submitted' : 'Draft'}
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Court of Appeal */}
        {currentStep === 1 && (
          <div className="mb-8">
            {renderCategorySection(
              courtOfAppealValues,
              handleCourtOfAppealChange,
              'coa',
              courtOfAppealTotal,
              'Pending Proceedings to Court of Appeal',
              [courtOfAppealCategory]
            )}
          </div>
        )}

        {/* Step 2: Subordinate Courts */}
        {currentStep === 2 && (
          <div className="mb-8">
            {renderCategorySection(
              subordinateCourtsValues,
              handleSubordinateCourtsChange,
              'sub',
              subordinateCourtsTotal,
              'Pending Proceedings from Subordinate Courts',
              [subordinateCourtsCategory]
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        {!isSubmitted && (
          <div className="flex justify-between items-center mb-6">
            {currentStep === 2 && (
              <button
                onClick={handlePrevStep}
                className="px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-400 transition-colors"
              >
                ← Previous (Court of Appeal)
              </button>
            )}
            {currentStep === 1 && (
              <button
                onClick={handleNextStep}
                className="px-6 py-2 bg-[#1e3a5f] text-white font-semibold rounded-md hover:bg-[#12253d] transition-colors ml-auto"
              >
                Next (Subordinate Courts) →
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-4 items-center">
          {!isSubmitted && (
            <button
              onClick={handleSubmitDraft}
              disabled={isSubmitting}
              className="px-6 py-3 bg-[#1e3a5f] text-white font-semibold rounded-md hover:bg-[#12253d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : (isEditing ? 'Update Submission' : 'Submit')}
            </button>
          )}

          {/* ✅ Show hint that nil returns are allowed */}
          {!isSubmitted && totalItems === 0 && (
            <span className="text-sm text-purple-600">
              💡 You can submit a nil return if you have no pending proceedings
            </span>
          )}

          {isSubmitted && (
            <div className="bg-green-50 border border-green-300 text-green-800 px-6 py-3 rounded-md text-sm font-semibold">
              ✓ This form has been submitted and is locked
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Submission</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to submit this form? <br />
                <span className="font-semibold text-red-600">The page will be locked immediately after submission.</span>
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelSubmit}
                  className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSubmit}
                  className="px-4 py-2 bg-[#1e3a5f] text-white font-semibold rounded-md hover:bg-[#12253d] transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Nil Return Confirmation Dialog */}
        {showNilConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Nil Return</h3>
              <p className="text-gray-600 mb-4">
                You are about to submit a <strong>nil return</strong> (all quantities are zero).
                <br /><br />
                This confirms that you have reviewed the request and there are no pending proceedings to report.
                <br /><br />
                <span className="text-sm text-gray-500">You can still update this submission later if needed.</span>
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelNilSubmit}
                  className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmNilSubmit}
                  className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors"
                >
                  Submit Nil Return
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-8 bg-white border border-gray-300 rounded-lg p-6">
          <h3 className="font-semibold text-gray-800 mb-2">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Court of Appeal:</span>
              <span className="ml-2 font-semibold">{courtOfAppealTotal}</span>
            </div>
            <div>
              <span className="text-gray-600">Subordinate Courts:</span>
              <span className="ml-2 font-semibold">{subordinateCourtsTotal}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Items:</span>
              <span className="ml-2 font-semibold">{totalItems}</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`ml-2 font-semibold ${
                isSubmitted || formData.status === 'submitted' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {isSubmitted || formData.status === 'submitted' ? 'Submitted' : 'Draft'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrForm;